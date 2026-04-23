/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { Scenes, Markup } from 'telegraf';
import { prisma } from '@/lib/prisma';
import { PricingService } from '@/services/finance';
import { ORDER_WIZARD } from './order.wizard';
import { escapeHtml } from '../utils/formatter';

export const CATALOG_WIZARD = 'catalog-wizard';

export const catalogWizard = new Scenes.WizardScene(
    CATALOG_WIZARD,
    // ШАГ 1: Выбор Платформы
    async (ctx: any) => {
        // Fetch active platforms that have at least one active internal service
        const platforms = await prisma.socialPlatform.findMany({
            where: {
                isActive: true,
                internalServices: { some: { isActive: true } }
            },
            take: 200,
            orderBy: { slug: 'asc' }
        });

        if (platforms.length === 0) {
            await ctx.reply('😔 Извините, каталог временно пуст.');
            return ctx.scene.leave();
        }

        const buttons = platforms.map(p => {
            const label = p.icon ? `${p.icon} ${p.name}` : p.name;
            return [Markup.button.callback(label, `select_platform_${p.slug}`)];
        });

        await ctx.reply('📱 <b>Выберите социальную сеть:</b>', {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(buttons)
        });
        return ctx.wizard.next();
    },
    // ШАГ 2: Обработка Платформы и Выбор Категории
    async (ctx: any) => {
        if (!ctx.callbackQuery?.data?.startsWith('select_platform_')) return;

        const slug = ctx.callbackQuery.data.replace('select_platform_', '');
        const socialPlatform = await prisma.socialPlatform.findUnique({ where: { slug } });

        ctx.wizard.state.platformSlug = slug;
        ctx.wizard.state.platformName = socialPlatform?.name || slug;

        // Fetch categories from ServiceCategory model instead of enum
        const categories = await prisma.serviceCategory.findMany({
      take: 200,
            where: {
                projectId: ctx.project.id,
                platform: (socialPlatform?.slug.toUpperCase() as any) || (slug.toUpperCase() as any),
                isActive: true,
                internalServices: { some: { isActive: true } }
            },
            orderBy: { priority: 'desc' }
        });

        const buttons = categories.map(c => [
            Markup.button.callback(c.name, `select_cat_${c.id}`)
        ]);

        await ctx.editMessageText(`📂 <b>${escapeHtml(ctx.wizard.state.platformName)}</b>\nВыберите тип услуги (Активность):`, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([...buttons, [Markup.button.callback('🔙 Назад', 'back_to_platforms')]])
        });
        return ctx.wizard.next();
    },
    // ШАГ 3: Выбор конкретной услуги (Тарифа)
    async (ctx: any) => {
        if (ctx.callbackQuery?.data === 'back_to_platforms') {
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
                return [Markup.button.callback(label, `select_platform_${p.slug}`)];
            });
            await ctx.editMessageText('📱 <b>Выберите социальную сеть:</b>', {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard(buttons)
            });
            return ctx.wizard.selectStep(1);
        }

        if (!ctx.callbackQuery?.data?.startsWith('select_cat_')) return;

        const categoryId = ctx.callbackQuery.data.replace('select_cat_', '');
        const platformSlug = ctx.wizard.state.platformSlug;
        const platformName = ctx.wizard.state.platformName;

        const category = await prisma.serviceCategory.findUnique({
            where: { id: categoryId }
        });

        const services = await prisma.internalService.findMany({
      take: 200,
            where: {
                categoryId: categoryId,
                isActive: true
            },
            include: {
                projectOverrides: {
                    where: { projectId: ctx.project.id }
                }
            },
            orderBy: { rating: 'desc' }
        });

        const filteredServices = services.filter(s => {
            const override = s.projectOverrides?.[0];
            return override ? override.isActive : true;
        });

        const buttons = filteredServices.map(s => {
            const override = s.projectOverrides?.[0];
            const name = override?.customName || s.name;
            const per1000 = PricingService.getPricePerUnit(s.pricePer1000);
            const guaranteeInfo = s.guaranteeDays > 0 ? ` [🛡 ${s.guaranteeDays}д]` : '';
            return [Markup.button.callback(`${name}${guaranteeInfo} — ${per1000}₽/шт.`, `select_svc_${s.id}`)];
        });

        await ctx.editMessageText(`🏷 <b>${escapeHtml(platformName)} / ${escapeHtml(category?.name || 'Услуги')}</b>\nВыберите подходящий тариф:`, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([...buttons, [Markup.button.callback('🔙 Назад', `select_platform_${platformSlug}`)]])
        });
        return ctx.wizard.next();
    },
    // ШАГ 4: Переход к заказу
    async (ctx: any) => {
        if (ctx.callbackQuery?.data?.startsWith('select_platform_')) {
            // Возврат к категориям
            return ctx.wizard.selectStep(1); // can reuse logic but let's just trigger step 2 handler
            // actually easier to just call the logic again or use a better state machine
        }

        if (!ctx.callbackQuery?.data?.startsWith('select_svc_')) return;

        const serviceId = ctx.callbackQuery.data.replace('select_svc_', '');
        const service = await prisma.internalService.findUnique({ where: { id: serviceId } });

        if (!service) return ctx.answerCbQuery('Услуга не найдена');

        // Переходим в ORDER_WIZARD с предвыбранной услугой
        await ctx.scene.enter(ORDER_WIZARD, { preSelectedService: service });
    }
);

// Глобальные экшены
catalogWizard.action('back_to_platforms', async (ctx: any) => {
    // Handled in step 3 but for safety:
    return ctx.wizard.selectStep(0);
});


