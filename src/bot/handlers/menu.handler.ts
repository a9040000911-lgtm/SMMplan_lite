/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { Markup } from 'telegraf';
import { formatServiceId } from '@/utils/id-formatter';
import { prisma } from '@/lib/prisma';
import { SessionService } from '@/services/core';
import { PricingService } from '@/services/finance';
import { LoyaltyService } from '@/services/users';
import { formatAmount } from '@/utils/formatter';
import { getProjectMenu, findMenuItem, staticMainMenu, categoryNames } from '../utils/menu.utils';
import { AUTO_WIZARD } from '../scenes/auto.wizard';
import { REFERRAL_WIZARD } from '../scenes/referral.wizard';
import { Decimal } from 'decimal.js';
import { getOrderStatusLabel } from '@/utils/order-utils';

export async function handleMenuAction(actionId: string, ctx: any) {
    switch (actionId) {
        case 'ORDER': return ctx.scene.enter('order-wizard');
        case 'AUTO': return ctx.scene.enter(AUTO_WIZARD);
        case 'ORDERS': return showOrders(ctx);
        case 'BALANCE': return showProfile(ctx);
        case 'REFERRALS': return ctx.scene.enter(REFERRAL_WIZARD);
        case 'SUPPORT': return ctx.scene.enter('support-wizard');
        case 'CATALOG': return showCatalog(ctx);
        case 'INFO': return showInfo(ctx);
        case 'NEWS': return ctx.reply('🆕 <b>НОВОСТИ ПРОЕКТА</b>\n────────────────────\nСледите за обновлениями в нашем канале!', { parse_mode: 'HTML' });
        case 'URL_BUTTON': {
            const layout = ctx.project?.config?.menuLayout || [];
            const item = findMenuItem(layout, 'URL_BUTTON', ctx.message?.text);
            const url = item?.metadata?.url || process.env.NEXT_PUBLIC_APP_URL || 'https://smmplan.ru';
            return ctx.reply(`🔗 <b>ПЕРЕХОД ПО ССЫЛКЕ</b>\n────────────────────\nНажмите кнопку ниже, чтобы открыть ресурс:`, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([[Markup.button.url(item?.label || 'Открыть', url)]])
            });
        }
        case 'DEPOSIT': return ctx.scene.enter('deposit-wizard');
        case 'PROMO': return showPromoInput(ctx);
        case 'CATEGORY': {
            const layout = ctx.project?.config?.menuLayout || [];
            const item = findMenuItem(layout, 'CATEGORY', ctx.message?.text);
            if (item?.metadata?.categoryId) {
                return showCategoryServices(ctx, 'ALL', item.metadata.categoryId);
            }
            return showCatalog(ctx);
        }
        case 'FAQ': return ctx.reply('❓ <b>ЧАСТЫЕ ВОПРОСЫ</b>\n────────────────────\n1. Как сделать заказ?\n2. Сроки выполнения?\n3. Гарантии?\n\n<i>Для подробного ответа напишите в поддержку.</i>', { parse_mode: 'HTML' });
        case 'CONTACTS': {
            const layout = ctx.project?.config?.menuLayout || [];
            const item = findMenuItem(layout, 'CONTACTS', ctx.message?.text);
            const managerId = (ctx.project?.config as any)?.managerId;

            let contactText = item?.metadata?.text;

            if (!contactText) {
                if (managerId) {
                    const managerLink = managerId.startsWith('@') ? managerId : `@${managerId}`;
                    contactText = `👤 <b>ВАШ ПЕРСОНАЛЬНЫЙ МЕНЕДЖЕР</b>\n────────────────────\nСвязь со специалистом: <b>${managerLink}</b>\n\n<i>Менеджер поможет с подбором услуг и решением вопросов.</i>`;
                } else {
                    contactText = '👤 <b>НАШИ КОНТАКТЫ</b>\n────────────────────\nАдминистратор: @admin\nПоддержка: @support_tg';
                }
            }

            return ctx.reply(contactText, { parse_mode: 'HTML' });
        }
        case 'WEBAPP': {
            const layout = ctx.project?.config?.menuLayout || staticMainMenu;
            const item = findMenuItem(layout, 'WEBAPP', ctx.message?.text);
            const webAppUrl = item?.metadata?.url || (ctx.project?.domain ? `http://${ctx.project.domain}` : (process.env.NEXT_PUBLIC_APP_URL || process.env.WEBAPP_URL || 'http://89.23.98.202'));

            return ctx.reply('🚀 Нажмите на кнопку ниже, чтобы открыть:', {
                ...getProjectMenu(ctx.project),
                ...Markup.inlineKeyboard([[Markup.button.webApp(item?.label || 'Открыть Web-App', webAppUrl)]])
            });
        }
        case 'MASS': return (await import('../commands/mass.command')).handleMassOrderCommand(ctx);
        default: return;
    }
}

export async function showProfile(ctx: any) {
    const userId = ctx.from.id;
    const user = await prisma.user.findUnique({
        where: { tgId: BigInt(userId) },
        include: { _count: { select: { orders: true } } }
    });
    if (!user) return ctx.reply('❌ Пользователь не найден. Напишите /start', getProjectMenu(ctx.project));

    const spent = user.spent.toNumber();
    const loyalty = await LoyaltyService.getLoyaltyInfo(user.id, spent, ctx.project.id);
    const date = user.createdAt.toLocaleDateString('ru-RU');

    const loyaltySettings = (ctx.project as any)?.loyaltySettings;
    const isLevelsEnabled = loyaltySettings?.levels !== false;

    const pioneerInfo = (user.earlyBirdRank && loyaltySettings?.earlyBird !== false) ? `\n💎 <b>СТАТУС: ПЕРВОПРОХОДЕЦ #${user.earlyBirdRank}</b>\n└ <i>Приоритетное обслуживание активно</i>\n` : '';

    const loyaltyProgress = (isLevelsEnabled && loyalty.nextLevel) ? `\n\n🚀 До статуса <b>${loyalty.nextLevel.name}</b> осталось потратить: <b>${formatAmount(new Decimal(loyalty.nextLevel.min).minus(spent))}₽</b>` : '';
    const statusLine = isLevelsEnabled ? `🏆 Статус: <b>${loyalty.level.name}</b>\n` : '';

    const profileText = `👤 <b>ЛИЧНЫЙ КАБИНЕТ</b>\n────────────────────\n🆔 ID: <code>${user.id}</code>\n📅 Регистрация: ${date}\n${pioneerInfo}${statusLine}🎁 Скидка: <b>${loyalty.totalDiscount}%</b>\n💰 Баланс: <b>${formatAmount(user.balance)}₽</b>\n📦 Заказов: <b>${user._count.orders}</b>\n💸 Потрачено: <b>${formatAmount(user.spent)}₽</b>${loyaltyProgress}`;

    const buttons = [
        [Markup.button.callback('💳 Пополнить баланс', 'deposit_start')],
        [Markup.button.callback('📦 История заказов', 'my_orders_list')],
        [Markup.button.callback('🎁 Ввести промокод', 'use_promo')],
        [Markup.button.callback('🚀 Вход на сайт (Web)', 'web_login')]
    ];

    if (!user.email) {
        buttons.push([Markup.button.callback('📧 Привязать Email', 'bind_email_start')]);
    }

    await ctx.reply(profileText, {
        parse_mode: 'HTML',
        ...getProjectMenu(ctx.project),
        ...Markup.inlineKeyboard(buttons)
    });
}

export async function showOrders(ctx: any) {
    const user = await prisma.user.findUnique({ where: { tgId: BigInt(ctx.from!.id) } });
    if (!user) return;
    const orders = await prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 5, include: { internalService: true } });
    if (orders.length === 0) return ctx.reply('📭 У вас еще нет заказов.', getProjectMenu(ctx.project));
    for (const o of orders) {
        const resText = `🔹 <b>Заказ #${o.id}</b>\n🏷 ${o.internalService.name}\n📊 Статус: <b>${getOrderStatusLabel(o.status)}</b>`;
        await ctx.reply(resText, { parse_mode: 'HTML', ...getProjectMenu(ctx.project) });
    }
}

export async function showStore(_ctx: any) { // Alias for Shop command mostly
}

export async function showCatalog(ctx: any) {
    return showPlatformSelection(ctx);
}

export async function showInfo(ctx: any) {
    const user = await prisma.user.findUnique({ where: { tgId: BigInt(ctx.from!.id) } });
    if (!user) return;
    const loyalty = await LoyaltyService.getLoyaltyInfo(user.id, user.spent.toNumber(), ctx.project.id);
    const resText = `ℹ️ <b>ИНФОРМАЦИЯ</b>\n\n👤 Статус: ${loyalty.level.name}\n💰 Потрачено: ${formatAmount(user.spent)}₽\n🎁 Скидка: ${loyalty.totalDiscount}%`;
    await ctx.reply(resText, { parse_mode: 'HTML', ...getProjectMenu(ctx.project), ...Markup.inlineKeyboard([[Markup.button.callback('📜 Юр. информация', 'show_legal_docs'), Markup.button.callback('🤝 Поддержка', 'support_main')]]) });
}

export async function showLegalDocs(ctx: any) {
    const documents = await (prisma as any).legalDocument.findMany({
        where: { projectId: ctx.project.id, isActive: true },
        take: 20,
        select: { id: true, title: true }
    });

    if (documents.length === 0) {
        return ctx.reply('😔 Юридическая информация пока не загружена.');
    }

    const buttons = documents.map((doc: { id: string, title: string }) => [Markup.button.callback(doc.title, `view_doc_${doc.id}`)]);
    buttons.push([Markup.button.callback('🔙 Назад', 'show_info')]);

    const text = '⚖️ <b>ЮРИДИЧЕСКАЯ ИНФОРМАЦИЯ</b>\n────────────────────\nВыберите документ для ознакомления:';

    if (ctx.callbackQuery) {
        await ctx.answerCbQuery().catch(() => { });
        await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }).catch(() => { });
    } else {
        await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    }
}

export async function showPromoInput(ctx: any) {
    await SessionService.set(ctx.from!.id, { isWaitingForPromo: true }, ctx.project.id);
    await ctx.reply('🎟 <b>ПРОМОКОДЫ</b>\n────────────────────\nВведите промокод в чат для активации:', { parse_mode: 'HTML', ...getProjectMenu(ctx.project) });
}

export async function showCatalogSearch(ctx: any) {
    await SessionService.set(ctx.from!.id, { isWaitingForCatalogSearch: true }, ctx.project.id);
    await ctx.reply('🔍 <b>ПОИСК ПО КАТАЛОГУ</b>\n────────────────────\nВведите название услуги (например: "подписчики"):', { parse_mode: 'HTML', ...getProjectMenu(ctx.project) });
}

export async function showPlatformSelection(ctx: any) {
    const platforms = await prisma.socialPlatform.findMany({
      take: 200,
        where: {
            isActive: true,
            internalServices: { some: { isActive: true } }
        },
        orderBy: { slug: 'asc' }
    });

    const buttons = platforms.map(p => {
        const label = p.icon ? `${p.icon} ${p.name}` : p.name;
        return [Markup.button.callback(label, `browse_p_${p.slug}`)];
    });
    buttons.push([Markup.button.callback('🔍 ПОИСК', 'search_catalog')]);
    const text = '📑 <b>Каталог услуг</b>\n\nВыберите платформу:';
    if (ctx.callbackQuery) {
        await ctx.answerCbQuery().catch(() => { });
        await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }).catch(() => { });
    } else {
        await ctx.reply(text, { parse_mode: 'HTML', ...getProjectMenu(ctx.project), ...Markup.inlineKeyboard(buttons) });
    }
}

export async function showPlatformCategories(ctx: any, _link: string, analysis: any) {
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => { });
    const services = await prisma.internalService.findMany({
      take: 200,
        where: {
            socialPlatform: { slug: analysis.platform.toLowerCase() },
            isActive: true,
            categoryId: { not: null }
        },
        include: { serviceCategory: true }
    });
    const catsMap = new Map<string, string>();
    for (const s of services) {
        if (s.serviceCategory && !catsMap.has(s.serviceCategory.categoryType)) {
            catsMap.set(s.serviceCategory.categoryType, s.serviceCategory.categoryType);
        }
    }
    const cats = Array.from(catsMap.keys());
    const buttons = cats.map(cat => [Markup.button.callback(categoryNames[cat] || cat, `cat_${analysis.platform.toLowerCase()}_${cat}`)]);
    await ctx.reply('🔍 Выберите категорию:', { parse_mode: 'HTML', ...getProjectMenu(ctx.project), ...Markup.inlineKeyboard(buttons) });
}

export async function showCategoryServices(ctx: any, platformSlug: string, categoryIdentifier: string) {
    const where: any = { isActive: true };
    // categoryIdentifier could be a categoryId (UUID) or categoryType (enum string)
    if (categoryIdentifier.includes('-')) {
        // It's a UUID categoryId
        where.categoryId = categoryIdentifier;
    } else {
        // It's a categoryType enum
        where.serviceCategory = { categoryType: categoryIdentifier };
    }
    if (platformSlug !== 'ALL') where.socialPlatform = { slug: platformSlug.toLowerCase() };

    const services = await prisma.internalService.findMany({
      take: 200,
        where,
        orderBy: { pricePer1000: 'asc' },
        include: { serviceCategory: true, socialPlatform: true }
    });
    if (services.length === 0) return ctx.reply('😔 В этой категории пока нет услуг.');

    const buttons = [];
    for (const s of services) {
        const price = await PricingService.getServicePrice(s.id, ctx.project.id);
        const platformPrefix = s.socialPlatform?.slug?.toUpperCase() || 'OTH';
        const categoryPrefix = s.serviceCategory?.categoryType || 'OTH';
        const serviceDisplayId = formatServiceId(platformPrefix, categoryPrefix, s.id);
        const label = `🆔 ${serviceDisplayId} | ${s.name.substring(0, 20)}... | ${formatAmount(price.mul(s.priceUnit).div(1000))}₽`;
        buttons.push([Markup.button.callback(label, `svc_${s.id}`)]);
    }

    const backAction = platformSlug === 'ALL' ? 'browse_catalog' : `browse_p_${platformSlug}`;
    buttons.push([Markup.button.callback('🔙 Назад', backAction)]);

    const categoryLabel = services[0]?.serviceCategory?.name || categoryNames[categoryIdentifier] || categoryIdentifier;
    const text = `📑 <b>${categoryLabel}</b>\n────────────────────\nВыберите тариф для заказа:`;

    if (ctx.callbackQuery) {
        await ctx.answerCbQuery().catch(() => { });
        await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) }).catch(() => { });
    } else {
        await ctx.reply(text, { parse_mode: 'HTML', ...getProjectMenu(ctx.project), ...Markup.inlineKeyboard(buttons) });
    }
}


