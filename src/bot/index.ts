/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 *
 * MIGRATED TO SMMPLAN LITE CORE (April 2026)
 * Removed: BullMQ queues, @/workers, @/lib/prisma, multi-project bots,
 *          startWebhookServer, SessionService, BotRegistry, CryptoService,
 *          RedisSessionStore, projectMiddleware, moderationMiddleware
 * Uses: db from @/lib/db, single-bot mode via TELEGRAM_BOT_TOKEN
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { Scenes, session, Telegraf, Markup } from 'telegraf';
import { db } from '@/lib/db';

// Scenes — only import wizards that have been migrated to Lite core
import { orderWizard, ORDER_WIZARD } from './scenes/order.wizard';
// TODO: Migrate remaining wizards (deposit, support, referral, catalog) to Lite core
// import { depositWizard } from './scenes/deposit.wizard';
// import { supportWizard } from './scenes/support.wizard';
// import { referralWizard } from './scenes/referral.wizard';
// import { catalogWizard } from './scenes/catalog.wizard';

// ── BOT INSTANCE ──
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN || TOKEN === 'dummy_token') {
  console.warn('[Bot] TELEGRAM_BOT_TOKEN not set. Telegram bot will NOT start.');
}

export const bot = new Telegraf(TOKEN || 'dummy_token');

// ── STAGE ──
const stage = new Scenes.Stage<Scenes.WizardContext>([
  orderWizard as any,
]);

// ── MIDDLEWARE ──
bot.use(session());
bot.use(stage.middleware() as any);

// ── ERROR HANDLER ──
bot.catch(async (err: any, ctx: any) => {
  try {
    const description = err?.response?.description || err?.message || '';
    // Ignore common non-critical Telegram errors
    if (
      description.includes('query is too old') ||
      description.includes('message to edit not found') ||
      description.includes('bot was blocked by the user') ||
      description.includes('user is deactivated') ||
      description.includes('chat not found') ||
      description.includes('message is not modified')
    ) {
      return;
    }

    console.error(`[Bot] ERROR [${ctx?.updateType || 'unknown'}]:`, err);

    if (ctx && typeof ctx.reply === 'function') {
      await ctx.reply('⚠️ Произошла техническая ошибка. Мы уже исправляем её.').catch(() => {});
    }
  } catch (e) {
    console.error('[Bot] Error in catch handler:', e);
  }
});

// ── COMMANDS ──
bot.start(async (ctx: any) => {
  const tgId = String(ctx.from.id);

  // Upsert user by telegramId
  let user = await db.user.findFirst({ where: { telegramId: tgId } });
  if (!user) {
    user = await db.user.upsert({
      where: { email: `tg_${tgId}@smmplan.bot` },
      update: { telegramId: tgId },
      create: {
        email: `tg_${tgId}@smmplan.bot`,
        telegramId: tgId,
      }
    });
  }

  await ctx.reply(
    `👋 <b>Добро пожаловать в Smmplan!</b>\n\n` +
    `💰 Ваш баланс: <b>${(user.balance / 100).toFixed(2)}₽</b>\n\n` +
    `Используйте меню ниже:`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        keyboard: [
          [{ text: '🛍 Каталог' }, { text: '📦 Мои заказы' }],
          [{ text: '💰 Пополнить' }, { text: '🆘 Поддержка' }],
        ],
        resize_keyboard: true,
      }
    }
  );
});

bot.hears('🛍 Каталог', async (ctx: any) => {
  // Show list of active services as simple buttons
  const services = await db.service.findMany({
    where: { isActive: true },
    take: 20,
    orderBy: { numericId: 'asc' },
    select: { id: true, name: true, minQty: true, maxQty: true, isDripFeedEnabled: true }
  });
  if (services.length === 0) return ctx.reply('😔 Каталог пока пуст.');

  const buttons = services.map((s: any) => [Markup.button.callback(s.name, `order_svc_${s.id}`)]);
  await ctx.reply('🛍 <b>Каталог услуг:</b>\nВыберите услугу для заказа:', {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(buttons)
  });
});

// Inline handler: Start order wizard with pre-selected service
bot.action(/^order_svc_(.+)$/, async (ctx: any) => {
  const serviceId = ctx.match[1];
  const service = await db.service.findUnique({ where: { id: serviceId } });
  if (!service) return ctx.answerCbQuery('Услуга не найдена');
  await ctx.answerCbQuery();
  return ctx.scene.enter(ORDER_WIZARD, { preSelectedService: service });
});

bot.hears('💰 Пополнить', async (ctx: any) => {
  // TODO: Migrate deposit wizard to Lite core
  await ctx.reply('💰 <b>Пополнение баланса</b>\n\nДля пополнения баланса используйте веб-интерфейс:\n' +
    `${process.env.NEXT_PUBLIC_APP_URL || 'https://smmplan.ru'}/dashboard`, { parse_mode: 'HTML' });
});
bot.hears('🆘 Поддержка', async (ctx: any) => {
  // TODO: Migrate support wizard to Lite core
  await ctx.reply('🆘 <b>Поддержка</b>\n\nНапишите ваш вопрос на support@smmplan.ru или создайте тикет в веб-интерфейсе.', { parse_mode: 'HTML' });
});
bot.hears('📦 Мои заказы', async (ctx: any) => {
  const tgId = String(ctx.from.id);
  const user = await db.user.findFirst({ where: { telegramId: tgId } });
  if (!user) return ctx.reply('Используйте /start для регистрации.');

  const orders = await db.order.findMany({
    where: { userId: user.id },
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { service: { select: { name: true } } }
  });

  if (orders.length === 0) {
    return ctx.reply('📦 У вас пока нет заказов.');
  }

  const statusEmoji: Record<string, string> = {
    'PENDING': '🕐', 'IN_PROGRESS': '🔄', 'COMPLETED': '✅',
    'PARTIAL': '⚠️', 'CANCELED': '❌', 'ERROR': '🔴',
    'AWAITING_PAYMENT': '💳', 'PROVISIONING': '⏳'
  };

  let text = '📦 <b>Ваши последние заказы:</b>\n\n';
  for (const o of orders) {
    const emoji = statusEmoji[o.status] || '❓';
    text += `${emoji} #${o.numericId} — ${o.service?.name || 'Услуга'}\n` +
      `   ${o.quantity} шт. | ${(o.charge / 100).toFixed(2)}₽ | ${o.status}\n\n`;
  }

  await ctx.reply(text, { parse_mode: 'HTML' });
});

// ── LAUNCH ──
if (process.env.NODE_ENV !== 'test' && !process.env.NEXT_PHASE && process.env.SKIP_BOT !== 'true') {
  if (TOKEN && TOKEN !== 'dummy_token') {
    bot.launch().then(() => {
      console.log('[Bot] ✅ Telegram bot launched successfully');
    }).catch((e: any) => {
      console.error('[Bot] ❌ Failed to launch:', e.message);
    });
  }
}

/**
 * --- GRACEFUL SHUTDOWN ---
 * Handles SIGTERM/SIGINT signals from Docker/PM2/tini
 */
async function handleShutdown(signal: string) {
  console.log(`[Bot] --- Signal ${signal} received. Graceful shutdown ---`);

  try {
    // 1. Stop the Telegram bot polling
    if (bot) {
      console.log('[Bot] Stopping bot polling...');
      bot.stop(signal);
    }

    // 2. Close database connection pool
    try {
      await db.$disconnect();
      console.log('[Bot] Prisma connection pool closed.');
    } catch (e) {
      console.error('[Bot] Error disconnecting Prisma:', e);
    }

    console.log('[Bot] --- All processes stopped. Exiting. ---');
    process.exit(0);
  } catch (err) {
    console.error('[Bot] Error during graceful shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
