/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { Markup } from 'telegraf';
import { prisma } from '@/lib/prisma';
import { SettingsService, SessionService } from '@/services/core';
import { PricingService } from '@/services/finance';
import { PromoService } from '@/services/users';
import { formatAmount } from '@/utils/formatter';
import { getProjectMenu } from '../utils/menu.utils';

export async function handleStart(ctx: any) {
    const userId = ctx.from.id;
    const startPayload = ctx.payload;
    const projectId = ctx.project.id;

    await SessionService.delete(userId, projectId).catch(() => { });

    const user = await prisma.user.findUnique({ where: { tgId: BigInt(userId) } });

    // CASE: Deep link for binding TG to Email account
    if (startPayload && startPayload.startsWith('bind_')) {
        const userIdPrefix = startPayload.replace('bind_', '');

        // Find existing account with this prefix (Email-based)
        const targetUser = await prisma.user.findFirst({
            where: {
                projectId,
                id: { startsWith: userIdPrefix }
            }
        });

        if (!targetUser) {
            return ctx.reply('❌ <b>Ошибка привязки:</b> Аккаунт не найден. Попробуйте обновить страницу на сайте и нажать кнопку еще раз.', { parse_mode: 'HTML' });
        }

        // If target account already has a TG bound
        if (targetUser.tgId) {
            if (targetUser.tgId === BigInt(userId)) {
                return ctx.reply('✅ <b>Ваш аккаунт уже привязан к этому Telegram!</b>', { parse_mode: 'HTML', ...getProjectMenu(ctx.project) });
            }
            return ctx.reply('⚠️ <b>Этот аккаунт уже привязан к другому Telegram.</b> Обратитесь в поддержку для смены привязки.', { parse_mode: 'HTML' });
        }

        // Check if CURRENT Telegram is already bound to SOME other account with balance or orders
        if (user && user.id !== targetUser.id) {
            if (user.balance.gt(0) || await prisma.order.count({ where: { userId: user.id } }) > 0) {
                return ctx.reply('⚠️ <b>Ваш Telegram уже привязан к другому аккаунту с балансом или заказами.</b>\nДля объединения обратитесь в поддержку.', { parse_mode: 'HTML' });
            }
            // If current TG user is "empty", we can safely "move" the TG to the target account
            // Actually, we'll just delete the "empty" bot-only user and update the target one
            await prisma.user.delete({ where: { id: user.id } });
        }

        // Final Bind
        await prisma.user.update({
            where: { id: targetUser.id },
            data: {
                tgId: BigInt(userId),
                username: ctx.from.username || targetUser.username
            }
        });

        await SessionService.delete(userId, projectId).catch(() => { });
        await ctx.reply('🎊 <b>АККАУНТ УСПЕШНО ПРИВЯЗАН!</b>\n────────────────────\nТеперь ваш баланс и заказы на сайте и в боте синхронизированы.', { parse_mode: 'HTML', ...getProjectMenu(ctx.project) });
        return;
    }

    if (!user) {
        let referrerId: string | null = null;
        if (startPayload && !startPayload.startsWith('svc_')) {
            // Attempt to find referrer in the CURRENT project
            // Assuming startPayload is the user ID or a short code from the link
            // If it's a short code (uuid prefix), we might need to search with startsWith or similar if we don't have full ID.
            // But usually DeepLink is the full ID or a mapped code. 
            // Let's assume it's the ID prefix or full ID.
            // A standard Prisma UUID's first segment is 8 characters. We require at least 6 characters 
            // to prevent wildcard 'startsWith' matching that funnels all organic traffic to the Admin.
            if (startPayload.length >= 6) {
                const potentialReferrer = await prisma.user.findFirst({
                    where: {
                        projectId,
                        id: { startsWith: startPayload } // Matches "start={user.id.split('-')[0]}" logic from referral.wizard.ts
                    }
                });

                if (potentialReferrer && potentialReferrer.tgId !== BigInt(userId)) {
                    referrerId = potentialReferrer.id;
                }
            }
            }

        const newUser = await prisma.user.create({
            data: {
                projectId,
                tgId: BigInt(userId),
                username: ctx.from.username,
                balance: 0,
                referrerId
            }
        });
        await PromoService.processAutomationRules('REGISTRATION', { userId: newUser.id, tgId: userId, value: 0, projectId });
    } else {
        await prisma.user.update({
            where: { id: user.id },
            data: { username: ctx.from.username }
        });
    }

    try {
        await ctx.reply('🏠 <b>Главное меню активировано</b>', { parse_mode: 'HTML', ...getProjectMenu(ctx.project) });

        if (startPayload && startPayload.startsWith('svc_')) {
            const serviceId = startPayload.replace('svc_', '');
            const service = await prisma.internalService.findUnique({ where: { id: serviceId, isActive: true } });
            if (service) {
                const price = await PricingService.getServicePrice(service.id, projectId);
                await ctx.reply(`✨ <b>ПРЯМОЙ ЗАКАЗ</b>\n────────────────────\nУслуга: <b>${service.name}</b>\nЦена: <b>${formatAmount(price.mul(service.priceUnit).div(1000))}₽</b> за ${service.priceUnit} шт.\n\n🚀 <b>Пришлите ссылку для оформления:</b>`, { parse_mode: 'HTML' });
                await SessionService.set(userId, { serviceId: service.id, isWaitingForLink: true }, projectId);
                return;
            }
        }

        // --- MODULAR WELCOME SYSTEM ---
        const config = ctx.project.config as any || {};
        const modules = config.botModules as any[];

        let messagesToSend: string[] = [];

        if (modules && modules.length > 0) {
            // Sort by order and filter enabled
            const activeModules = modules
                .filter(m => m.isEnabled)
                .sort((a, b) => a.order - b.order);

            messagesToSend = activeModules.map(m => m.content);
        } else {
            // Legacy Fallback
            const defaultWelcome = `👋 <b>Добро пожаловать в ${ctx.project.name}!</b>\n\n🚀 <b>Мы — ваш инструмент №1 для роста в соцсетях.</b>\n🎁 <b>АКЦИЯ: СТАТУС «ПЕРВОПРОХОДЕЦ»</b>\nОформите первый заказ и получите <b>пожизненную скидка 20%</b>.\n\n👇 <b>Выберите действие или отправьте ссылку:</b>`;
            const welcomeText = config.welcomeText || await SettingsService.get('BOT_WELCOME_TEXT', projectId) || defaultWelcome;
            messagesToSend = [welcomeText];
        }

        // Send messages
        for (let i = 0; i < messagesToSend.length; i++) {
            const isLast = i === messagesToSend.length - 1;
            const text = messagesToSend[i];

            // WebApp URL Logic (Moved here)
            let webAppUrl = ctx.project?.domain ? `https://${ctx.project.domain}` : (process.env.NEXT_PUBLIC_APP_URL || process.env.WEBAPP_URL || "https://smmplan.ru");
            if (webAppUrl.startsWith('http://') && !webAppUrl.includes('localhost') && !webAppUrl.includes('.local')) {
                webAppUrl = webAppUrl.replace('http://', 'https://');
            }

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('🚀 ЗАКАЗАТЬ', 'start_order'), Markup.button.callback('🤖 АВТО-ПИЛОТ', 'start_auto')],
                ...(webAppUrl.startsWith('https://') ? [[Markup.button.webApp('📱 Открыть Web-App', webAppUrl)]] : []),
                [
                    Markup.button.callback('👤 Личный кабинет', 'profile'),
                    Markup.button.callback('📑 Каталог услуг', 'browse_catalog')
                ],
                [Markup.button.callback('🆘 Поддержка', 'support_main')]
            ]);

            // Only attach keyboard to the LAST message to avoid clutter
            if (isLast) {
                await ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
            } else {
                await ctx.reply(text, { parse_mode: 'HTML' });
            }
        }
    } catch (e: any) {
        if (e.message?.includes('blocked') || e.code === 403) {
            console.warn(`⚠️ User ${userId} blocked the bot. Skipping reply.`);
            return;
        }
        console.error('Error in handleStart:', e);
    }
}


