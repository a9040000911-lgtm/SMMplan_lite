/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { Scenes, Markup } from 'telegraf';
import { LinkService } from '@/services/providers';
import { prisma } from '@/lib/prisma';
import { UnifiedPaymentService } from '@/services/payments/unified-payment.service';
import { formatAmount } from '@/utils/formatter';
import { PricingService } from '@/services/finance';
import { SessionService } from '@/services/core';
import { escapeHtml } from '../utils/formatter';

export const ORDER_WIZARD = 'order-wizard';

// Helper function to show final confirmation
async function showFinalConfirmation(ctx: any) {
  const { service, qty, isDripFeed, runs, interval, link } = ctx.wizard.state.orderData;
  const tgId = ctx.from.id;
  const user = await prisma.user.findUnique({
    where: { tgId: BigInt(tgId) }
  });
  if (!user) return ctx.scene.leave();

  const state = await SessionService.get(Number(tgId), String(ctx.project.id));
  const appliedPromo = state?.appliedPromo;

  const details = await PricingService.calculateOrderDetails(user.id, service.id, qty, ctx.project.id, appliedPromo?.code);
  const { finalPrice, discountAmount, promoId } = details;

  // [GUARD-ZERO-PRICE] Prevent free orders via bot (mirrors API guard in route.ts)
  if (finalPrice.lte(0)) {
    await ctx.reply('❌ <b>Ошибка:</b> Услуга недоступна для заказа (некорректная цена). Обратитесь в поддержку.', { parse_mode: 'HTML' });
    return ctx.scene.leave();
  }

  
  ctx.wizard.state.orderData.totalPrice = finalPrice;
  ctx.wizard.state.orderData.promoId = promoId;

  const override = service.projectOverrides?.[0];
  const displayName = override?.customName || service.name;

  let summaryText = `🛒 <b>ПОДТВЕРЖДЕНИЕ ЗАКАЗА</b>\n────────────────────\n` +
    `📦 Услуга: <b>${escapeHtml(displayName)}</b>\n` +
    `🔗 Ссылка: <code>${escapeHtml(link)}</code>\n` +
    `🔢 Количество: <b>${qty.toLocaleString()} шт.</b>\n`;

  if (isDripFeed) {
    const perRun = Math.floor(qty / runs);
    const totalTime = runs * interval;
    summaryText += `💧 <b>Drip-Feed:</b> Включен\n` +
      `   ├ Запусков: <b>${runs}</b> (по ~${perRun} шт.)\n` +
      `   └ Интервал: <b>${interval} мин.</b> (Всего: ~${(totalTime / 60).toFixed(1)} ч.)\n`;
  }

  if (discountAmount.gt(0)) {
    summaryText += `🎁 Скидка: <b>${formatAmount(discountAmount)}₽</b>\n`;
  }
  summaryText += `────────────────────\n`;
  summaryText += `💰 К оплате: <b>${formatAmount(finalPrice)}₽</b>`;

  if (ctx.wizard.state.orderData.warning) {
    summaryText += `\n\n⚠️ <b>ОБРАТИТЕ ВНИМАНИЕ:</b>\n<i>${escapeHtml(ctx.wizard.state.orderData.warning)}</i>`;
  }

  const confirmLabel = user.balance.gte(finalPrice)
    ? '🚀 Оплатить и запустить'
    : `💳 ДОПЛАТИТЬ И ЗАПУСТИТЬ (${formatAmount(finalPrice.minus(user.balance))}₽)`;

  await ctx.reply(summaryText, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.callback(confirmLabel, 'confirm_order')],
      [Markup.button.callback('❌ Отмена', 'cancel_wizard')]
    ])
  });

  return ctx.wizard.selectStep(6);
}

export const orderWizard = new Scenes.WizardScene(
  ORDER_WIZARD,
  // ШАГ 1: Запрос ссылки
  async (ctx: any) => {
    // Проверяем, пришли ли мы из каталога с уже выбранной услугой
    const preSelected = ctx.scene.state?.preSelectedService;
    if (preSelected) {
      // Load overrides if not present
      if (!preSelected.projectOverrides) {
        preSelected.projectOverrides = await prisma.projectServiceOverride.findMany({
          where: { projectId: ctx.project.id, internalServiceId: preSelected.id },
          take: 50
        });
      }

      const override = preSelected.projectOverrides?.[0];
      const displayName = override?.customName || preSelected.name;

      // Find social platform name if relation is not loaded
      const socialPlatform = preSelected.socialPlatform ||
        (preSelected.socialPlatformId ? await prisma.socialPlatform.findUnique({ where: { id: preSelected.socialPlatformId } }) : null);

      ctx.wizard.state.orderData = {
        service: preSelected,
        platformName: socialPlatform?.name || 'Unknown',
        platformSlug: socialPlatform?.slug || 'other',
        platformEnum: socialPlatform?.slug?.toUpperCase() || 'OTHER',
        minQty: preSelected.minQty,
        maxQty: preSelected.maxQty
      };
      await ctx.reply(`✨ <b>ВЫБРАНО:</b> ${escapeHtml(displayName)}\n\n🚀 <b>Пришлите ссылку:</b>`, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[Markup.button.callback('❌ Отмена', 'cancel_wizard')]])
      });
      return ctx.wizard.next();
    }

    await ctx.reply('🔗 <b>Пришлите ссылку:</b>\n<i>(Пост, канал, профиль, видео или плейлист)</i>', {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[Markup.button.callback('❌ Отмена', 'cancel_wizard')]])
    });
    return ctx.wizard.next();
  },
  // ШАГ 2: Ссылка и Категория/Количество
  async (ctx: any) => {
    if (!ctx.message?.text) return ctx.reply('Пожалуйста, отправьте текстовую ссылку.');
    const link = ctx.message.text.trim();

    // Если услуга уже выбрана в каталоге
    if (ctx.wizard.state.orderData?.service) {
      const service = ctx.wizard.state.orderData.service;
      const platformEnum = (service.socialPlatform?.slug?.toUpperCase() || ctx.wizard.state.orderData.platformEnum || 'OTHER') as import('@prisma/client').Platform;
      const validation = LinkService.validate(link, platformEnum, service.targetType);

      if (!validation.isValid) {
        return ctx.reply(`❌ <b>Эта ссылка не подходит для данной услуги!</b>\n\n${validation.error || 'Убедитесь, что ссылка корректна.'}\nПришлите другую ссылку или нажмите Отмена:`, {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([[Markup.button.callback('❌ Отмена', 'cancel_wizard')]])
        });
      }

      ctx.wizard.state.orderData.link = link;
      if (validation.isWarning) {
        ctx.wizard.state.orderData.warning = validation.warning;
      }
      const override = service.projectOverrides?.[0];
      const displayName = override?.customName || service.name;
      const displayDesc = override?.customDescription || service.description;

      const perUnit = PricingService.getPricePerUnit(service.pricePer1000);
      const guaranteeInfo = service.guaranteeDays > 0 ? `\n🛡 Гарантия: <b>${service.guaranteeDays} дн.</b>` : '';

      let message = `🏷 <b>Услуга:</b> ${escapeHtml(displayName)}${guaranteeInfo}\n💰 Цена: <b>${perUnit}₽</b> за шт.\n`;
      if (displayDesc) {
        message += `\n📖 <b>Описание:</b>\n<i>${escapeHtml(displayDesc)}</i>\n`;
      }
      message += `\n⌨️ <b>Введите количество:</b>\nМинимум: <b>${service.minQty}</b>\nМаксимум: <b>${service.maxQty}</b>`;

      await ctx.reply(message, { parse_mode: 'HTML' });
      return ctx.wizard.selectStep(2); // Переходим сразу к вводу количества (Шаг 3 в массиве)
    }

    // Если услуги нет — классический Smart Flow (по ссылке)
    const analysis = LinkService.analyze(link);
    if (!analysis) {
      return ctx.reply('❌ Ссылка не распознана. Пришлите рабочую ссылку или нажмите «Отмена»:', {
        ...Markup.inlineKeyboard([[Markup.button.callback('❌ Отмена', 'cancel_wizard')]])
      });
    }

    const socialPlatform = await prisma.socialPlatform.findFirst({
      where: { slug: analysis.platform.toLowerCase() }
    });
    const platformName = socialPlatform?.name || analysis.platform;

    ctx.wizard.state.orderData = {
      link,
      platform: analysis.platform,
      platformName,
      targetType: analysis.targetType,
      isPrivate: analysis.isPrivate ?? false,
      possibleCategories: analysis.possibleCategories
    };

    const targetTypes = LinkService.getCompatibleTypes(analysis.targetType, analysis.platform);
    const services = await prisma.internalService.findMany({
      take: 200,
      where: {
        socialPlatform: { slug: analysis.platform.toLowerCase() },
        isActive: true,
        targetType: { in: targetTypes },
        isPrivate: analysis.isPrivate === true,
        serviceCategory: analysis.possibleCategories?.length ? { categoryType: { in: analysis.possibleCategories } } : undefined,
        categoryId: { not: null }
      },
      distinct: ['categoryId'],
      select: { categoryId: true }
    });

    const categories = await prisma.serviceCategory.findMany({
      take: 200,
      where: {
        id: { in: services.map(s => s.categoryId!) },
        isActive: true
      },
      orderBy: { priority: 'desc' }
    });

    if (categories.length === 0) {
      await ctx.reply('😔 Для этого типа ссылки пока нет доступных услуг.');
      return ctx.scene.leave();
    }

    const buttons = categories.map(c => [Markup.button.callback(c.name, `select_cat_${c.id}`)]);
    await ctx.reply(`🔍 Платформа: <b>${escapeHtml(platformName)}</b>\nТип: <b>${escapeHtml(analysis.targetType)}</b>\nВыберите категорию:`, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard(buttons)
    });
    return;
  },
  // ШАГ 3: Количество
  async (ctx: any) => {
    if (!ctx.message?.text) return ctx.reply('Введите числовое значение.');
    const qty = parseInt(ctx.message.text);
    const { minQty, maxQty } = ctx.wizard.state.orderData;

    if (isNaN(qty) || qty < minQty || qty > maxQty) {
      return ctx.reply(`❌ Неверное количество. Введите число от <b>${minQty}</b> до <b>${maxQty}</b>:`, { parse_mode: 'HTML' });
    }

    ctx.wizard.state.orderData.qty = qty;

    await ctx.reply(`💧 <b>Хотите включить постепенную накрутку (Drip-Feed)?</b>\n\nЭто позволит разделить заказ ${qty} шт. на несколько мелких запусков.`, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('✅ Да, включить', 'drip_yes')],
        [Markup.button.callback('Нет, обычный заказ', 'drip_no')]
      ])
    });

    return ctx.wizard.next();
  },
  // ШАГ 4: Обработка Drip выбор
  async (ctx: any) => {
    if (ctx.callbackQuery) {
      const action = ctx.callbackQuery.data;
      if (action === 'drip_no') {
        ctx.wizard.state.orderData.isDripFeed = false;
        await ctx.answerCbQuery();
        return showFinalConfirmation(ctx);
      } else if (action === 'drip_yes') {
        ctx.wizard.state.orderData.isDripFeed = true;
        await ctx.answerCbQuery();
        await ctx.reply('🔢 <b>Введите количество запусков (Runs):</b>\nНапример: 5');
        return ctx.wizard.next();
      }
    }
    return;
  },
  // ШАГ 5: Ввод Runs
  async (ctx: any) => {
    if (!ctx.message?.text) return ctx.reply('Введите число.');
    const runs = parseInt(ctx.message.text);
    if (isNaN(runs) || runs < 2) return ctx.reply('❌ Количество запусков должно быть не менее 2.');
    const { qty } = ctx.wizard.state.orderData;
    if (Math.floor(qty / runs) < 10) return ctx.reply(`❌ Слишком много запусков для количества ${qty}. В каждом запуске должно быть хотя бы 10 шт.`);
    ctx.wizard.state.orderData.runs = runs;
    await ctx.reply('⏱ <b>Введите интервал между запусками (в минутах):</b>\nНапример: 60');
    return ctx.wizard.next();
  },
  // ШАГ 6: Ввод Interval
  async (ctx: any) => {
    if (!ctx.message?.text) return ctx.reply('Введите число.');
    const interval = parseInt(ctx.message.text);
    if (isNaN(interval) || interval < 1) return ctx.reply('❌ Интервал должен быть не менее 1 минуты.');
    ctx.wizard.state.orderData.interval = interval;
    return showFinalConfirmation(ctx);
  },
  // ШАГ 7: Ожидание подтверждения
  async (_ctx: any) => { return; }
);

// ГЛОБАЛЬНЫЙ ЗАЩИТНИК СЦЕНЫ
orderWizard.use(async (ctx: any, next: any) => {
  if (ctx.callbackQuery) {
    const data = ctx.callbackQuery.data;
    const wizardActions = [
      'select_cat_', 'select_group_', 'select_svc_',
      'drip_', 'confirm_order', 'cancel_wizard',
      'back_to_cats', 'cancel_order'
    ];
    if (!wizardActions.some(p => data.startsWith(p))) {
      await ctx.scene.leave();
      return next();
    }
  }
  if (ctx.message?.text?.startsWith('/') && ctx.message?.text !== '/cancel') {
    await ctx.scene.leave();
    return next();
  }
  return next();
});

// Дополнительные обработчики экшенов
orderWizard.action(/^select_cat_(.+)$/, async (ctx: any) => {
  const categoryId = ctx.match[1];
  const { platform, targetType, isPrivate } = ctx.wizard.state.orderData;
  const targetTypes = LinkService.getCompatibleTypes(targetType, platform);

  const svcs = await prisma.internalService.findMany({
      take: 200,
    where: {
      categoryId,
      isActive: true,
      socialPlatform: { slug: platform.toLowerCase() },
      isPrivate: isPrivate === true,
      targetType: { in: targetTypes }
    },
    include: { serviceCategory: true }
  });

  if (svcs.length === 0) return ctx.answerCbQuery('Нет услуг для этой категории');

  const groupsMap = new Map();
  svcs.forEach(s => {
    // If it's a "solo" service (not part of a sub-group, but since we are already in a category, 
    // we might want to check for further grouping or just list them)
    // In Smmplan, usually ServiceCategory is the group.
    const key = `service_${s.id}`;
    groupsMap.set(key, { name: s.name, service: s });
  });

  const buttons = Array.from(groupsMap.values()).map(data => {
    const perUnit = PricingService.getPricePerUnit(data.service.pricePer1000);
    return [Markup.button.callback(`${data.name} — ${perUnit}₽/шт.`, `select_svc_${data.service.id}`)];
  });

  const catName = svcs[0].serviceCategory?.name || 'Выбор тарифа';
  await ctx.editMessageText(`📦 Категория: <b>${escapeHtml(catName)}</b>\nВыберите подходящий тариф:`, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([...buttons, [Markup.button.callback('🔙 Назад', 'back_to_cats')]])
  });
});

orderWizard.action(/^select_group_(.+)$/, async (ctx: any) => {
  const categoryId = ctx.match[1];
  const { platform, isPrivate } = ctx.wizard.state.orderData;
  const svcs = await prisma.internalService.findMany({
      take: 200,
    where: { categoryId, isActive: true, socialPlatform: { slug: platform.toLowerCase() }, isPrivate: isPrivate === true },
    include: { serviceCategory: true }
  });
  if (svcs.length === 0) return ctx.answerCbQuery('В этой группе нет доступных тарифов');

  const buttons = svcs.map(s => {
    const perUnit = PricingService.getPricePerUnit(s.pricePer1000);
    return [Markup.button.callback(`${s.name} — ${perUnit}₽/шт.`, `select_svc_${s.id}`)];
  });
  const groupName = svcs[0].serviceCategory?.name || 'Выбор тарифа';
  await ctx.editMessageText(`📁 Группа: <b>${escapeHtml(groupName)}</b>\nВыберите подходящий тариф:`, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([...buttons, [Markup.button.callback('🔙 Назад', 'back_to_cats')]])
  });
});

orderWizard.action(/^select_svc_(.+)$/, async (ctx: any) => {
  const serviceId = ctx.match[1];
  const service = await prisma.internalService.findUnique({
    where: { id: serviceId },
    include: {
      serviceCategory: true,
      socialPlatform: true,
      projectOverrides: {
        where: { projectId: ctx.project.id }
      }
    }
  });
  if (!service) return ctx.answerCbQuery('Услуга не найдена');

  const link = ctx.wizard.state.orderData.link;
  const svcPlatformEnum = (service.socialPlatform?.slug?.toUpperCase() || 'OTHER') as import('@prisma/client').Platform;
  const validation = LinkService.validate(link, svcPlatformEnum, service.targetType);
  if (!validation.isValid) return ctx.answerCbQuery('❌ ' + (validation.error || 'Эта ссылка не подходит'), { show_alert: true });

  ctx.wizard.state.orderData.service = service;
  ctx.wizard.state.orderData.minQty = service.minQty;
  ctx.wizard.state.orderData.maxQty = service.maxQty;
  if (validation.isWarning) {
    ctx.wizard.state.orderData.warning = validation.warning;
  }

  const override = service.projectOverrides?.[0];
  const displayName = override?.customName || service.name;
  const displayDesc = override?.customDescription || service.description;

  const perUnit = PricingService.getPricePerUnit(service.pricePer1000);
  const tierInfo = '';
  const guaranteeInfo = service.guaranteeDays > 0 ? `\n🛡 Гарантия: <b>${service.guaranteeDays} дн.</b>` : '';

  let message = `🏷 <b>ВЫБРАНО:</b> ${escapeHtml(displayName)}${tierInfo}${guaranteeInfo}\n💰 Цена: <b>${perUnit}₽</b> за шт.\n`;
  if (displayDesc) {
    message += `\n📖 <b>Описание:</b>\n<i>${escapeHtml(displayDesc)}</i>\n`;
  }
  message += `\n⌨️ <b>Введите количество:</b>\nМинимум: <b>${service.minQty}</b>\nМаксимум: <b>${service.maxQty}</b>`;

  await ctx.editMessageText(message, { parse_mode: 'HTML' });
  return ctx.wizard.selectStep(2);
});

orderWizard.action('confirm_order', async (ctx: any) => {
  const { service, qty, totalPrice, link, isDripFeed, runs, interval, promoId } = ctx.wizard.state.orderData;
  const tgId = ctx.from.id;
  try {
    const user = await prisma.user.findUnique({ where: { tgId: BigInt(tgId) } });
    if (!user) return ctx.scene.leave();

    if (user.balance.gte(totalPrice)) {
      const { initiateOrder } = await import('@/services/orders');
      await initiateOrder({
        userId: user.id, serviceId: service.id, projectId: ctx.project.id, link, qty, totalPrice,
        tgId: Number(tgId), username: ctx.from.username || undefined,
        isDripFeed, dripFeed: isDripFeed ? { runs, interval } : undefined,
        promoId
      });
      
      const state = await SessionService.get(Number(tgId), String(ctx.project.id));
      if (state && state.appliedPromo) {
          delete state.appliedPromo;
          await SessionService.set(Number(tgId), state, String(ctx.project.id));
      }
      
      await ctx.editMessageText('✅ <b>Заказ успешно создан!</b>\nОн уже передан в работу.', { parse_mode: 'HTML' });
    } else {
      const amountToPay = totalPrice.minus(user.balance);
      const res = await UnifiedPaymentService.createPayment(ctx.project.id, user.id, amountToPay.toNumber(), `Доплата за заказ: ${service.name}`, { source: 'BOT', serviceId: service.id, promoId });
      if (res.success && res.confirmationUrl) {
        await prisma.transaction.create({
          data: {
            projectId: ctx.project.id, userId: user.id, amount: amountToPay, type: 'DEPOSIT', provider: 'YOOKASSA', externalId: res.paymentId, status: 'PENDING',
            metadata: { serviceId: service.id, qty, link, isAutoOrder: true }
          }
        });
        await ctx.editMessageText(`💳 <b>НЕДОСТАТОЧНО СРЕДСТВ</b>\n────────────────────\nСтоимость: <b>${formatAmount(totalPrice)}₽</b>\nВаш баланс: <b>${formatAmount(user.balance)}₽</b>\n\n🚀 <b>Для запуска необходимо доплатить: ${formatAmount(amountToPay)}₽</b>\n\n<i>Нажмите кнопку ниже. Сразу после оплаты заказ будет запущен автоматически.</i>`, {
          parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.url('💳 ОПЛАТИТЬ И ЗАПУСТИТЬ', res.confirmationUrl)], [Markup.button.callback('❌ ОТМЕНА', 'cancel_wizard')]])
        });
      } else { await ctx.reply('❌ Ошибка платежной системы.'); }
    }
  } catch (e) {
    console.error(e);
    await ctx.reply('❌ Произошла ошибка.');
  }
  return ctx.scene.leave();
});

orderWizard.action('cancel_wizard', async (ctx: any) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('❌ Оформление отменено.');
  return ctx.scene.leave();
});

orderWizard.action('back_to_cats', async (ctx: any) => {
  const { platformName, targetType, isPrivate, possibleCategories, platform } = ctx.wizard.state.orderData;
  const targetTypes = LinkService.getCompatibleTypes(targetType, platform);

  const services = await prisma.internalService.findMany({
      take: 200,
    where: {
      socialPlatform: { slug: platform.toLowerCase() },
      isActive: true,
      targetType: { in: targetTypes },
      isPrivate: isPrivate === true,
      serviceCategory: possibleCategories?.length ? { categoryType: { in: possibleCategories } } : undefined,
      categoryId: { not: null }
    },
    distinct: ['categoryId'],
    select: { categoryId: true }
  });

  const categories = await prisma.serviceCategory.findMany({
      take: 200,
    where: {
      id: { in: services.map(s => s.categoryId!) },
      isActive: true
    },
    orderBy: { priority: 'desc' }
  });

  const buttons = categories.map(c => [Markup.button.callback(c.name, `select_cat_${c.id}`)]);
  await ctx.editMessageText(`🔍 Платформа: <b>${escapeHtml(platformName)}</b>\nТип: <b>${escapeHtml(targetType)}</b>\nВыберите категорию:`, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(buttons)
  });
  await ctx.answerCbQuery();
});


