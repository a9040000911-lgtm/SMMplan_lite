/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 *
 * MIGRATED TO SMMPLAN LITE CORE (April 2026)
 * Uses: db from @/lib/db, Service model, User.telegramId,
 *       orderService.createBotOrder(), marketingService.calculatePrice()
 */
import { Scenes, Markup } from 'telegraf';
import { db } from '@/lib/db';
import { orderService } from '@/services/core/order.service';
import { marketingService } from '@/services/marketing.service';
import { UnifiedPaymentService } from '@/services/financial/unified-payment.service';
import { escapeHtml } from '../utils/formatter';

export const ORDER_WIZARD = 'order-wizard';

/**
 * Format cents to human-readable RUB string.
 */
function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Resolve Lite User from Telegram context.
 * Schema: User.telegramId is String? containing the Telegram user ID.
 */
async function resolveUser(tgId: number) {
  return db.user.findFirst({
    where: { telegramId: String(tgId) }
  });
}

// ──────────────────────────────────────────────────────────────
// HELPER: Show final confirmation with pricing from Lite core
// ──────────────────────────────────────────────────────────────
async function showFinalConfirmation(ctx: any) {
  const { service, qty, isDripFeed, runs, interval, link } = ctx.wizard.state.orderData;
  const tgId = ctx.from.id;
  const user = await resolveUser(tgId);
  if (!user) {
    await ctx.reply('❌ Пользователь не найден. Используйте /start для регистрации.');
    return ctx.scene.leave();
  }

  // Calculate total quantity (for drip-feed: qty is per-run, total = qty * runs)
  const totalQuantity = (isDripFeed && runs > 1) ? qty * runs : qty;

  // Use Lite core pricing engine
  const pricing = await marketingService.calculatePrice(user.id, service.id, totalQuantity);

  // [GUARD-ZERO-PRICE] Prevent free orders
  if (pricing.totalCents <= 0) {
    await ctx.reply('❌ <b>Ошибка:</b> Услуга недоступна для заказа (некорректная цена). Обратитесь в поддержку.', { parse_mode: 'HTML' });
    return ctx.scene.leave();
  }

  ctx.wizard.state.orderData.totalCents = pricing.totalCents;
  ctx.wizard.state.orderData.providerCostCents = pricing.providerCostCents;
  ctx.wizard.state.orderData.totalQuantity = totalQuantity;

  let summaryText = `🛒 <b>ПОДТВЕРЖДЕНИЕ ЗАКАЗА</b>\n────────────────────\n` +
    `📦 Услуга: <b>${escapeHtml(service.name)}</b>\n` +
    `🔗 Ссылка: <code>${escapeHtml(link)}</code>\n` +
    `🔢 Количество: <b>${totalQuantity.toLocaleString()} шт.</b>\n`;

  if (isDripFeed && runs > 1) {
    const perRun = Math.floor(totalQuantity / runs);
    const totalTime = runs * interval;
    summaryText += `💧 <b>Drip-Feed:</b> Включен\n` +
      `   ├ Запусков: <b>${runs}</b> (по ~${perRun} шт.)\n` +
      `   └ Интервал: <b>${interval} мин.</b> (Всего: ~${(totalTime / 60).toFixed(1)} ч.)\n`;
  }

  if (pricing.discountCents > 0) {
    summaryText += `🎁 Скидка: <b>${formatCents(pricing.discountCents)}₽</b>\n`;
  }
  summaryText += `────────────────────\n`;
  summaryText += `💰 К оплате: <b>${formatCents(pricing.totalCents)}₽</b>`;

  const hasFunds = user.balance >= pricing.totalCents;
  const confirmLabel = hasFunds
    ? '🚀 Оплатить и запустить'
    : `💳 ДОПЛАТИТЬ И ЗАПУСТИТЬ (${formatCents(pricing.totalCents - user.balance)}₽)`;

  await ctx.reply(summaryText, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.callback(confirmLabel, 'confirm_order')],
      [Markup.button.callback('❌ Отмена', 'cancel_wizard')]
    ])
  });

  return ctx.wizard.selectStep(6);
}

// ──────────────────────────────────────────────────────────────
// WIZARD DEFINITION
// ──────────────────────────────────────────────────────────────
export const orderWizard = new Scenes.WizardScene(
  ORDER_WIZARD,

  // ШАГ 1: Начало — показать выбранную услугу или запросить ссылку
  async (ctx: any) => {
    const preSelected = ctx.scene.state?.preSelectedService;
    if (preSelected) {
      ctx.wizard.state.orderData = {
        service: preSelected,
        minQty: preSelected.minQty,
        maxQty: preSelected.maxQty
      };
      await ctx.reply(`✨ <b>ВЫБРАНО:</b> ${escapeHtml(preSelected.name)}\n\n🚀 <b>Пришлите ссылку:</b>`, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[Markup.button.callback('❌ Отмена', 'cancel_wizard')]])
      });
      return ctx.wizard.next();
    }

    // No pre-selected service — ask user to pick from catalog first
    await ctx.reply('🔗 <b>Выберите услугу из каталога</b>\nИспользуйте команду /shop для выбора услуги.', {
      parse_mode: 'HTML',
    });
    return ctx.scene.leave();
  },

  // ШАГ 2: Получение ссылки
  async (ctx: any) => {
    if (!ctx.message?.text) return ctx.reply('Пожалуйста, отправьте текстовую ссылку.');
    const link = ctx.message.text.trim();

    // Basic URL validation
    if (!link.includes('.') || link.length < 5) {
      return ctx.reply('❌ <b>Некорректная ссылка.</b> Пришлите ссылку на пост, канал, профиль или видео:', {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[Markup.button.callback('❌ Отмена', 'cancel_wizard')]])
      });
    }

    ctx.wizard.state.orderData.link = link;
    const { minQty, maxQty } = ctx.wizard.state.orderData;

    await ctx.reply(
      `⌨️ <b>Введите количество:</b>\nМинимум: <b>${minQty}</b>\nМаксимум: <b>${maxQty}</b>`,
      { parse_mode: 'HTML' }
    );
    return ctx.wizard.next();
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

    // Check if service supports drip-feed
    const service = ctx.wizard.state.orderData.service;
    if (service.isDripFeedEnabled) {
      await ctx.reply(`💧 <b>Хотите включить постепенную накрутку (Drip-Feed)?</b>\n\nЭто позволит разделить заказ ${qty} шт. на несколько мелких запусков.`, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('✅ Да, включить', 'drip_yes')],
          [Markup.button.callback('Нет, обычный заказ', 'drip_no')]
        ])
      });
    } else {
      ctx.wizard.state.orderData.isDripFeed = false;
      return showFinalConfirmation(ctx);
    }

    return ctx.wizard.next();
  },

  // ШАГ 4: Обработка выбора Drip-Feed
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
        await ctx.reply('🔢 <b>Введите количество запусков (Runs):</b>\nНапример: 5', { parse_mode: 'HTML' });
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
    await ctx.reply('⏱ <b>Введите интервал между запусками (в минутах):</b>\nНапример: 60', { parse_mode: 'HTML' });
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

  // ШАГ 7: Ожидание подтверждения (noop — handled via action)
  async (_ctx: any) => { return; }
);

// ──────────────────────────────────────────────────────────────
// SCENE GUARD: Ignore unrelated callbacks / slash commands
// ──────────────────────────────────────────────────────────────
orderWizard.use(async (ctx: any, next: any) => {
  if (ctx.callbackQuery) {
    const data = ctx.callbackQuery.data;
    const wizardActions = ['drip_', 'confirm_order', 'cancel_wizard'];
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

// ──────────────────────────────────────────────────────────────
// ACTION: Confirm Order — Uses Lite core orderService.createBotOrder()
// ──────────────────────────────────────────────────────────────
orderWizard.action('confirm_order', async (ctx: any) => {
  const {
    service, totalQuantity, totalCents, providerCostCents,
    link, isDripFeed, runs, interval
  } = ctx.wizard.state.orderData;
  const tgId = ctx.from.id;

  try {
    const user = await resolveUser(tgId);
    if (!user) {
      await ctx.reply('❌ Пользователь не найден.');
      return ctx.scene.leave();
    }

    if (user.balance >= totalCents) {
      // ── SUFFICIENT BALANCE: Atomic deduction via Lite core ──
      const result = await orderService.createBotOrder(user.id, {
        serviceId: service.id,
        link,
        quantity: totalQuantity,
        charge: totalCents,
        providerCost: providerCostCents,
        runs: isDripFeed ? runs : undefined,
        interval: isDripFeed ? interval : undefined,
      });

      if (result.success) {
        await ctx.editMessageText('✅ <b>Заказ успешно создан!</b>\nОн уже передан в работу.', { parse_mode: 'HTML' });
      } else {
        await ctx.editMessageText(`❌ <b>Ошибка:</b> ${escapeHtml(result.error || 'Неизвестная ошибка')}`, { parse_mode: 'HTML' });
      }
    } else {
      // ── INSUFFICIENT BALANCE: Generate payment link ──
      const deficit = totalCents - user.balance;
      const deficitRub = deficit / 100;

      const res = await UnifiedPaymentService.createPayment(
        undefined, // projectId (unused in Lite)
        user.id,
        deficitRub,
        `Доплата за заказ: ${service.name}`,
        { source: 'BOT', serviceId: service.id }
      );

      if (res.success && res.confirmationUrl) {
        await ctx.editMessageText(
          `💳 <b>НЕДОСТАТОЧНО СРЕДСТВ</b>\n────────────────────\n` +
          `Стоимость: <b>${formatCents(totalCents)}₽</b>\n` +
          `Ваш баланс: <b>${formatCents(user.balance)}₽</b>\n\n` +
          `🚀 <b>Для запуска необходимо доплатить: ${formatCents(deficit)}₽</b>\n\n` +
          `<i>Нажмите кнопку ниже. После оплаты пополните баланс и повторите заказ.</i>`,
          {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
              [Markup.button.url('💳 ОПЛАТИТЬ', res.confirmationUrl)],
              [Markup.button.callback('❌ ОТМЕНА', 'cancel_wizard')]
            ])
          }
        );
      } else {
        await ctx.reply('❌ Ошибка платежной системы. Попробуйте позже.');
      }
    }
  } catch (e: any) {
    console.error('[OrderWizard] confirm_order error:', e);
    await ctx.reply('❌ Произошла техническая ошибка. Попробуйте позже.');
  }
  return ctx.scene.leave();
});

orderWizard.action('cancel_wizard', async (ctx: any) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('❌ Оформление отменено.');
  return ctx.scene.leave();
});
