/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { SessionService } from '@/services/core';
import { LinkService } from '@/services/providers';
import { TicketService } from '@/services/support';
import { LedgerService } from '@/services/finance';
import { PricingService } from '@/services/finance';
import { normalizeLink } from '@/utils/normalizer';
import { formatAmount } from '@/utils/formatter';
import { handleMenuAction, showPlatformCategories } from './menu.handler';
import { getProjectMenu, MENU_ACTIONS, staticMainMenu } from '../utils/menu.utils';
import { triggerOrderPreview } from './order.handler';
import { handleMassOrderInput } from '../commands/mass.command';
import { Decimal } from 'decimal.js';
import { Markup } from 'telegraf';
import { ConfigService } from '@/services/core/config.service';
import { escapeHtml } from '../utils/formatter';

export async function handleText(ctx: any) {
    const text = ctx.message.text.trim();
    const userId = ctx.from.id;
    const projectId = (ctx as any).project.id;

    // --- 2.1. DYNAMIC MENU DISPATCHING ---
    const layout = ctx.project?.config?.menuLayout || staticMainMenu;
    let matchedActionId: string | null = null;
    for (const row of layout) {
        for (const item of row) {
            const id = typeof item === 'string' ? item : item.id;
            const label = typeof item === 'object' && item.label ? item.label : (MENU_ACTIONS[id]?.label || id);
            if (text === label) {
                matchedActionId = id;
                break;
            }
        }
        if (matchedActionId) break;
    }
    if (matchedActionId) return handleMenuAction(matchedActionId, ctx);

    const state = await SessionService.get(userId, projectId);
    const config = await ConfigService.getTelegramConfig(projectId);
    const adminId = config.adminId;

    // --- 3.1. STATES ---
    if (state?.isWaitingForMassOrder) {
        return handleMassOrderInput(ctx, state);
    }

    if (state?.isWaitingForCatalogSearch) {
        if (text.length < 3) {
            return ctx.reply('⚠️ Запрос слишком короткий. Введите минимум 3 символа:', getProjectMenu(ctx.project));
        }

        const rateLimitKey = `rl:search:${projectId}:${userId}`;
        const searchesAtMinute = await redis.incr(rateLimitKey);
        if (searchesAtMinute === 1) await redis.expire(rateLimitKey, 60);

        if (searchesAtMinute > 15) {
            return ctx.reply('🛑 Слишком много запросов поиска. Подождите пару минут.', getProjectMenu(ctx.project));
        }

        const services = await prisma.internalService.findMany({
            where: { isActive: true, OR: [{ name: { contains: text, mode: 'insensitive' } }, { description: { contains: text, mode: 'insensitive' } }] },
            include: { projectOverrides: { where: { projectId } } },
            take: 20,
            orderBy: { pricePer1000: 'asc' }
        });

        const filteredServices = services.filter(s => {
            const override = s.projectOverrides?.[0];
            return override ? override.isActive : true;
        }).slice(0, 10);

        if (filteredServices.length === 0) return ctx.reply('😔 Ничего не найдено.', getProjectMenu(ctx.project));
        const buttons = [];
        for (const s of filteredServices) {
            const price = await PricingService.getServicePrice(s.id, projectId);
            buttons.push([Markup.button.callback(`🚀 ${s.name.substring(0, 20)}... — ${parseFloat((price.toNumber() / 1000).toFixed(4))}₽`, `svc_${s.id}`)]);
        }
        buttons.push([Markup.button.callback('🔙 В каталог', 'browse_catalog')]);
        await ctx.reply(`🔍 <b>РЕЗУЛЬТАТЫ ПОИСКА: "${escapeHtml(text)}"</b>`, { parse_mode: 'HTML', ...getProjectMenu(ctx.project), ...Markup.inlineKeyboard(buttons) });
        await SessionService.delete(userId, projectId); return;
    }

    // --- 3.2. LINK ANALYSIS ---
    const normalizedText = normalizeLink(text);
    const analysis = LinkService.analyze(normalizedText);

    if (state?.isWaitingForLink && state.serviceId) {
        // Пользователь прислал ссылку для конкретной услуги (из Каталога)
        if (!analysis) return ctx.reply('❌ Ссылка не распознана. Попробуйте еще раз или выберите другую категорию.', getProjectMenu(ctx.project));

        // Подгружаем услугу для валидации типа ссылки
        const service = await prisma.internalService.findUnique({ where: { id: state.serviceId }, include: { socialPlatform: true } });
        if (!service) return ctx.reply('❌ Услуга не найдена.', getProjectMenu(ctx.project));

        // ВАЛИДАЦИЯ: Проверяем тип ссылки против типа услуги (например, POST vs CHANNEL)
        const svcPlatformEnum = (service.socialPlatform?.slug?.toUpperCase() || 'OTHER') as import('@prisma/client').Platform;
        const validation = LinkService.validate(normalizedText, svcPlatformEnum, service.targetType);
        if (!validation.isValid) {
            return ctx.reply(`❌ ${validation.error || 'Эта ссылка не подходит для данной услуги'}.`, getProjectMenu(ctx.project));
        }

        // Сохраняем ссылку и переходим к вводу количества
        state.link = normalizedText;
        state.isWaitingForLink = false;
        state.isWaitingForQty = true;
        if (validation.isWarning) state.warning = validation.warning;
        if (validation.isWarning) state.warning = validation.warning;

        const price = await PricingService.getServicePrice(service.id, projectId);
        const perUnit = price.mul(service.priceUnit).div(1000);
        await ctx.reply(
            `🔗 Ссылка принята: ${normalizedText}\n` +
            `🏷 Услуга: <b>${service.name}</b>\n` +
            `💰 Цена: <b>${formatAmount(perUnit)}₽</b> за ${service.priceUnit} шт.\n\n` +
            `⌨️ <b>Введите количество:</b>\n` +
            `От ${service.minQty} до ${service.maxQty}`,
            { parse_mode: 'HTML', ...getProjectMenu(ctx.project) }
        );
        await SessionService.set(userId, state, projectId);
        return;
    }

    const isAdminState = state?.isWaitingForNewsTitle || state?.isWaitingForNewsContent || state?.isWaitingForBroadcast || state?.isWaitingForOrderSearch || state?.isWaitingForUserSearch || state?.isWaitingForBalanceChange || state?.isWaitingForReferralPercent;
    const isSupportState = state?.activeTicketId || state?.isWaitingForSupport;

    if (analysis && !isAdminState && !isSupportState) {
        await SessionService.set(userId, { link: normalizedText, platform: analysis.platform, isPrivate: analysis.isPrivate }, projectId);
        return showPlatformCategories(ctx, normalizedText, analysis);
    }

    // --- 3.3. OTHER STATES ---
    if (state?.isWaitingForPromo) {
        const promo = await prisma.promoCode.findUnique({ where: { projectId_code: { projectId, code: text.toUpperCase() }, isActive: true } });
        if (!promo) return ctx.reply('❌ Код не найден.', getProjectMenu(ctx.project));
        state.appliedPromo = { code: promo.code, percent: promo.discountPercent };
        state.isWaitingForPromo = false;
        await SessionService.set(userId, state, projectId);
        await ctx.reply(`✅ Скидка ${promo.discountPercent}% применена!`, getProjectMenu(ctx.project));
        if (state.qty) return triggerOrderPreview(ctx, state); return;
    }

    if (state?.isWaitingForQty) {
        const qty = parseInt(text);
        if (isNaN(qty) || qty <= 0) return ctx.reply('❌ Введите число.', getProjectMenu(ctx.project));
        const svc = await prisma.internalService.findUnique({ where: { id: state.serviceId } });
        if (svc && (qty < svc.minQty || qty > svc.maxQty)) return ctx.reply(`❌ Доступно от ${svc.minQty} до ${svc.maxQty}.`, getProjectMenu(ctx.project));
        state.qty = qty; state.isWaitingForQty = false;
        await SessionService.set(userId, state, projectId);
        return triggerOrderPreview(ctx, state);
    }

    if (state?.isWaitingForSupport && state.activeTicketId) {
        await TicketService.addMessage(state.activeTicketId, 'USER', text);
        return ctx.reply('✅ Сообщение получено!', getProjectMenu(ctx.project));
    }

    if (state?.isWaitingForBalanceChange && adminId && userId === Number(adminId) && state.targetUserId) {
        const amount = new Decimal(parseFloat(text.replace(',', '.')) || 0);
        const updated = await prisma.$transaction(async (tx) => {
            const userManualUpdate = await tx.$queryRaw<any[]>`
                UPDATE "User"
                SET "balance" = "balance" + ${amount}
                WHERE "id" = ${state.targetUserId}
                RETURNING "balance"
            `;
            const exactBalanceAfter = new Decimal(userManualUpdate[0].balance);
            
            await LedgerService.record(tx, state.targetUserId!, amount.abs(), 'MANUAL_ADJUSTMENT', adminId.toString(), `Админ: ${amount}₽`, undefined, exactBalanceAfter);
            
            return { balance: exactBalanceAfter };
        });
        await ctx.reply(`✅ Баланс изменен: ${formatAmount(updated.balance)}₽`, getProjectMenu(ctx.project));
        await SessionService.delete(userId, projectId); return;
    }

    if (normalizedText.startsWith('http')) return ctx.reply('⚠️ Платформа не поддерживается.', getProjectMenu(ctx.project));
    return ctx.reply('⚠️ Ссылка не распознана. Используйте меню или отправьте ссылку на пост.', getProjectMenu(ctx.project));
}


