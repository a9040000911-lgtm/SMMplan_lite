/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { Markup } from 'telegraf';
import { prisma } from '@/lib/prisma';
import { handleConfirmMassOrder } from '../commands/mass.command';
import { SessionService } from '@/services/core';
import { AUTO_WIZARD } from '../scenes/auto.wizard';
import { BIND_EMAIL_WIZARD } from '../scenes/bind-email.wizard';
import { showProfile, showOrders, showPromoInput, showCatalogSearch, showCategoryServices, showInfo, showLegalDocs } from './menu.handler';
import { handleConfirmOrder, handleCancelOrder } from './order.handler';
import { categoryNames } from '../utils/menu.utils';

export function registerCallbackHandlers(bot: any) {
    // Specific Actions
    bot.action('start_auto', (ctx: any) => ctx.scene.enter(AUTO_WIZARD));
    bot.action('start_order', (ctx: any) => ctx.scene.enter('order-wizard'));
    bot.action('profile', (ctx: any) => showProfile(ctx));
    bot.action('confirm_order', handleConfirmOrder);
    bot.action('deposit_start', (ctx: any) => ctx.scene.enter('deposit-wizard'));
    bot.action('my_orders_list', (ctx: any) => showOrders(ctx));
    bot.action('use_promo', (ctx: any) => showPromoInput(ctx));
    bot.action('browse_catalog', (ctx: any) => ctx.scene.enter('catalog-wizard'));
    bot.action('search_catalog', (ctx: any) => showCatalogSearch(ctx));
    bot.action('support_main', (ctx: any) => ctx.scene.enter('support-wizard'));
    bot.action(/^support_order_(.+)$/, (ctx: any) => {
        const orderId = ctx.match[1];
        return ctx.scene.enter('support-wizard', { orderId });
    });
    bot.action('show_legal_docs', (ctx: any) => showLegalDocs(ctx));
    bot.action('show_info', (ctx: any) => showInfo(ctx));
    bot.action(/^view_doc_(.+)$/, async (ctx: any) => {
        const id = ctx.match[1];
        const doc = await (prisma as any).legalDocument.findFirst({ where: { id, isActive: true } });
        if (!doc) return ctx.answerCbQuery('❌ Документ не найден');

        const text = `📜 <b>${doc.title.toUpperCase()}</b>\n────────────────────\n\n${doc.content}\n\n────────────────────\n<i>📅 Обновлено: ${new Date(doc.updatedAt).toLocaleDateString('ru-RU')}</i>`;
        await ctx.editMessageText(text, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад к списку', 'show_legal_docs')]])
        }).catch(() => { });
    });
    bot.action('confirm_mass_order', handleConfirmMassOrder);
    bot.action('cancel_mass_order', async (ctx: any) => {
        const userId = ctx.from!.id;
        const projectId = ctx.project.id;
        await SessionService.delete(userId, projectId);
        return ctx.editMessageText('❌ Массовый заказ отменен.', { parse_mode: 'HTML' }).catch(() => { });
    });
    bot.action('cancel_order', handleCancelOrder);

    // MUTE BALANCE ALERTS
    bot.action('admin_mute_balance', async (ctx: any) => {
        const userId = ctx.from!.id;
        // Verify admin (simple check against env or role if available in ctx)
        const user = await prisma.user.findUnique({
            where: { tgId: BigInt(userId) }
        });

        if (!user || !['ADMIN', 'SEO'].includes(user.role)) {
            return ctx.answerCbQuery('⛔ Доступ запрещен', { show_alert: true });
        }

        const mutedUntil = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours
        const { SettingsService } = await import('@/services/core');
        await SettingsService.set('BALANCE_ALERT_MUTED_UNTIL', mutedUntil.toISOString(), ctx.project?.id); // Project scoped

        await ctx.answerCbQuery('✅ Уведомления отключены на 6 часов', { show_alert: true });
        await ctx.editMessageText(ctx.callbackQuery.message.text + '\n\n🔇 <b>Уведомления отключены на 6 часов.</b>', { parse_mode: 'HTML' }).catch(() => { });
    });

    bot.action('bind_email_start', (ctx: any) => ctx.scene.enter(BIND_EMAIL_WIZARD));

    bot.action('web_login', async (ctx: any) => {
        const userId = ctx.from!.id;
        const projectId = ctx.project.id;

        const user = await prisma.user.findUnique({
            where: { tgId: BigInt(userId) }
        });

        if (!user) return ctx.answerCbQuery('❌ Пользователь не найден');

        const { signMagicToken } = await import('@/services/core/magic-auth');
        const token = await signMagicToken({
            userId: user.id,
            tgId: userId.toString(),
            projectId: projectId
        });

        let webAppUrl = ctx.project?.domain ? `http://${ctx.project.domain}` : (process.env.NEXT_PUBLIC_APP_URL || process.env.WEBAPP_URL || 'http://89.23.98.202');
        if (webAppUrl.endsWith('/')) webAppUrl = webAppUrl.slice(0, -1);

        const loginUrl = `${webAppUrl}/auth/magic?token=${token}`;
        console.log(`[Bot] Generated MagicLink for user ${user.id}: ${loginUrl}`);

        await ctx.answerCbQuery('🔗 Ссылка для входа сгенерирована');
        await ctx.reply(`🌐 <b>ВХОД В WEB-ПАНЕЛЬ</b>\n────────────────────\nИспользуйте кнопку ниже для автоматического входа в личный кабинет через браузер.\n\n⚠️ <i>Ссылка действительна 5 минут.</i>`, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([[Markup.button.url('🚀 Открыть личный кабинет', loginUrl)]])
        });
    });

    bot.action('referrals_main', (ctx: any) => ctx.scene.enter('referral-wizard'));

    // Regex Actions
    bot.action(/^browse_p_(.+)$/, async (ctx: any) => {
        await ctx.answerCbQuery().catch(() => { });
        const slug = ctx.match[1];
        const socialPlatform = await prisma.socialPlatform.findUnique({ where: { slug } });
        const platformName = socialPlatform?.name || slug;

        const services = await prisma.internalService.findMany({
            where: {
                socialPlatform: { slug },
                isActive: true,
                categoryId: { not: null }
            },
            take: 50,
            include: { serviceCategory: true }
        });
        const catsMap = new Map<string, string>();
        for (const s of services) {
            if (s.serviceCategory && !catsMap.has(s.serviceCategory.categoryType)) {
                catsMap.set(s.serviceCategory.categoryType, s.serviceCategory.categoryType);
            }
        }
        const cats = Array.from(catsMap.keys());
        const buttons = cats.map(cat => [Markup.button.callback(categoryNames[cat] || cat, `cat_${slug}_${cat}`)]);
        buttons.push([Markup.button.callback('🔙 Назад', 'browse_catalog')]);
        await ctx.editMessageText(`📂 <b>${platformName}</b>: Выберите категорию`, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    });

    bot.action(/^cat_(.+?)_(.+)$/, async (ctx: any) => {
        return showCategoryServices(ctx, ctx.match[1], ctx.match[2]);
    });

    bot.action(/^cat_(.+)$/, async (ctx: any) => {
        const category = ctx.match[1];
        const state = await SessionService.get(ctx.from!.id, ctx.project.id);
        return showCategoryServices(ctx, state?.platform || 'TELEGRAM', category);
    });

    bot.action(/^svc_(.+)$/, async (ctx: any) => {
        const serviceId = ctx.match[1];
        const service = await prisma.internalService.findUnique({ where: { id: serviceId } });
        if (!service) return ctx.answerCbQuery('❌ Услуга не найдена');
        await ctx.scene.enter('order-wizard', { preSelectedService: service });
        await ctx.answerCbQuery();
    });

    // Phase 10B: NPS Survey handlers
    bot.action(/^nps_(.+)_(\d+)$/, async (ctx: any) => {
        const orderId = ctx.match[1];
        const score = parseInt(ctx.match[2]);

        const userId = ctx.from!.id;
        const user = await prisma.user.findUnique({
            where: { tgId: BigInt(userId) }
        });

        if (!user) {
            return ctx.answerCbQuery('❌ Пользователь не найден', { show_alert: true });
        }

        // Check ownership
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { userId: true }
        });

        if (!order || order.userId !== user.id) {
            return ctx.answerCbQuery('❌ Заказ не найден или вам не принадлежит', { show_alert: true });
        }

        // Import AdvocacyService dynamically
        const { AdvocacyService } = await import('@/services/advocacy/advocacy.service');

        // Record NPS response (sends thank you + follow-up automatically)
        await AdvocacyService.recordNPSResponse(user.id, orderId, score);

        await ctx.editMessageText(
            `📊 <b>Оценка принята!</b>\n\nВы оценили нас на <b>${score}/10</b>.\n\n✅ Спасибо за ваше мнение!`,
            { parse_mode: 'HTML' }
        ).catch(() => { });

        await ctx.answerCbQuery('✅ Оценка сохранена');
    });


}


