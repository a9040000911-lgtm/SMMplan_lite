/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { Scenes, session, Telegraf, Context } from 'telegraf';
import { prisma } from '@/lib/prisma';
import { startWebhookServer, SessionService } from '@/services/core';
import { bot, BotRegistry } from '@/services/bot/bot-registry';
import { CryptoService } from '@/services/core';
import { createLogger } from '@/lib/logger';
import { RedisSessionStore } from './utils/redis-session';

export interface SmmplanContext extends Context {
    project?: any;
    scene: Scenes.SceneContextScene<SmmplanContext, Scenes.WizardSessionData>;
    wizard: Scenes.WizardContextWizard<SmmplanContext>;
}


const logger = createLogger('Bot');

// Middleware
import { projectMiddleware } from './middleware/project.middleware';
import { moderationMiddleware } from './middleware/moderation.middleware';

// Scenes
import { orderWizard } from './scenes/order.wizard';
import { depositWizard } from './scenes/deposit.wizard';
import { supportWizard } from './scenes/support.wizard';
import { autoWizard } from './scenes/auto.wizard';
import { referralWizard } from './scenes/referral.wizard';
import { bindEmailWizard } from './scenes/bind-email.wizard';
import { catalogWizard } from './scenes/catalog.wizard';

// Commands
import { handleStart } from './commands/start.command';
import { handleShop } from './commands/shop.command';
import { handleAdmin } from './commands/admin.command';
import { handleOrders } from './commands/orders.command';
import { handleSupport } from './commands/support.command';
import { handleCancel } from './commands/cancel.command';
import { handleMassOrderCommand } from './commands/mass.command';
import { handleReviewCommand } from './commands/review.command';

// Handlers
import { handleText } from './handlers/text.handler';
import { handleMassOrderFile } from './commands/mass.command';
import { registerCallbackHandlers } from './handlers/callback.handler';
import { registerGuardianHandlers } from './handlers/guardian.handler';
import { getProjectMenu } from './utils/menu.utils';

const stage = new Scenes.Stage<Scenes.WizardContext>([
  orderWizard as any,
  depositWizard as any,
  supportWizard as any,
  autoWizard as any,
  referralWizard as any,
  bindEmailWizard as any,
  catalogWizard as any
]);

// --- MIDDLEWARE ---
bot.use(async (ctx: any, next) => {
  try {
    const log = `[${new Date().toISOString()}] Update:${ctx.updateType} from:${ctx.from?.id} text:${ctx.message?.text || 'non-text'}\n`;
  } catch (e: any) {
    console.error('[Bot Middleware] Debug log append failed:', e.message);
  }
  return next();
});
bot.use(projectMiddleware);
bot.use(moderationMiddleware);
bot.use(session({ 
  store: RedisSessionStore,
  getSessionKey: (ctx: any) => {
    if (ctx.from && ctx.chat) {
      const projectId = ctx.project?.id || 'default';
      return `${projectId}:${ctx.from.id}:${ctx.chat.id}`;
    }
    return undefined;
  }
}));
bot.use(stage.middleware() as any);

// --- QUEUES ---
import { orderQueue, syncQueue, auditQueue, balanceQueue, failoverQueue, scheduledOrderQueue } from '@/services/core/queues';
import '../workers';

export const startBackgroundTasks = async () => {
  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TOKEN || TOKEN === 'dummy_token') return;

  await orderQueue.add('process-pending', {}, { repeat: { every: 30000 } });
  await syncQueue.add('sync-all', {}, { repeat: { every: 300000 } });
  await auditQueue.add('daily-audit', {}, { repeat: { pattern: '0 3 * * *' } });
  await syncQueue.add('retention-check', {}, { repeat: { pattern: '0 10 * * *' } });
  await balanceQueue.add('check-low-balance', {}, { repeat: { every: 1800000 } });
  await failoverQueue.add('check-stuck-orders', {}, { repeat: { every: 900000 } }); // Every 15 minutes
  await syncQueue.add('check-auto-posts', {}, { repeat: { every: 300000 } });
  await scheduledOrderQueue.add('check-scheduled', {}, { repeat: { every: 60000 } });
};

// Extract error handler for reuse across multiple instances
const errorHandler = async (err: any, ctx: any) => {
  try {
    const description = err?.response?.description || err?.message || "";
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

    logger.error(`БОТ ОШИБКА [${ctx?.updateType || 'unknown'}]:`, { error: err, update: ctx?.update });

    // Try to notify user if context is available
    if (ctx && typeof ctx.reply === 'function') {
      const menu = ctx.project ? getProjectMenu(ctx.project) : {};
      await ctx.reply('⚠️ Произошла техническая ошибка. Мы уже исправляем её.', {
        parse_mode: 'HTML',
        ...menu
      }).catch(() => { });
    }
  } catch (e) {
    console.error('Error in bot.catch handler:', e);
  }
};

// Global Error Handler for default instance
bot.catch(errorHandler);

// --- COMMANDS ---
bot.start(handleStart);
bot.command('shop', handleShop);
bot.command('admin', handleAdmin);
bot.command('orders', handleOrders);
bot.command('support', handleSupport);
bot.command('cancel', handleCancel);
bot.command('mass', handleMassOrderCommand);
bot.command('review', handleReviewCommand);

// --- HANDLERS ---
bot.on('text', handleText);
bot.on('document', async (ctx: any) => {
  const state = await SessionService.get(ctx.from.id, ctx.project.id);
  if (state?.isWaitingForMassOrder) {
    return handleMassOrderFile(ctx, state);
  }
});
registerCallbackHandlers(bot);
registerGuardianHandlers(bot);

// --- MULTI-BOT STARTUP ---
const botCommands = [
  { command: 'start', description: '🚀 Главное меню' },
  { command: 'shop', description: '🛍 Магазин' },
  { command: 'mass', description: '📊 Массовый заказ' },
  { command: 'orders', description: '📦 Заказы' },
  { command: 'support', description: '🆘 Поддержка' },
  { command: 'guardian', description: '🛡 VIP Guardian' },
  { command: 'cancel', description: '❌ Отмена' }
];

const launchedProjectBots = new Set<string>();

async function startBotInstance(project: any) {
  if (!project.botToken) return;

  try {
    if (launchedProjectBots.has(project.id)) return;
    
    let decryptedToken: string;
    try {
        decryptedToken = CryptoService.decrypt(project.botToken!);
    } catch {
        decryptedToken = project.botToken!; // Fallback in case of raw token
    }

    launchedProjectBots.add(project.id);
    const instance = new Telegraf(decryptedToken);
    instance.catch(errorHandler);

    // FIX: Register instance in registry so BotRegistry.get(projectId) works
    BotRegistry.register(project.id, instance);

    await instance.telegram.setMyCommands(botCommands).catch(() => { });
    instance.use((ctx: any, next) => { ctx.project = project; return next(); });
    instance.use(bot.middleware());

    // Use catch to prevent crash loop if launch fails
    instance.launch().catch(e => {
      logger.error(`ОШИБКА LAUNCH БОТА [${project.name}]:`, { error: e.message });
      launchedProjectBots.delete(project.id);
    });

    logger.info(`БОТ ЗАПУЩЕН: ${project.name} (@${project.slug})`);
  } catch (e: any) {
    logger.error(`ОШИБКА ЗАПУСКА БОТА [${project.name}]:`, { error: e.message, response: e.response });
    launchedProjectBots.delete(project.id);
  }
}

let isChecking = false;

async function checkNewBots() {
  if (isChecking) return;
  isChecking = true;
  try {
    const projects = await prisma.project.findMany({
      where: {
        botToken: { not: null },
        isActive: true
      } as any,
      take: 100
    }) as any[];

    for (const project of projects) {
      if (project.botToken && !launchedProjectBots.has(project.id)) {
        await startBotInstance(project);
      }
    }
  } catch (e) {
    logger.error('Ошибка при проверке новых ботов:', e);
  } finally {
    isChecking = false;
  }
}

async function startAllBots() {
  logger.info('--- ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ БОТОВ ---');
  await checkNewBots();

  // Periodically check for new bots every 60 seconds
  setInterval(checkNewBots, 60000);
}

if (process.env.NODE_ENV !== 'test' && !process.env.NEXT_PHASE && process.env.SKIP_BOT !== 'true') {
  startAllBots().then(async () => {
    // Also start the default bot if configured
    const defaultToken = process.env.TELEGRAM_BOT_TOKEN;
    if (defaultToken && defaultToken !== 'dummy_token' && process.env.SKIP_BOT !== 'true') {

      const projects = await prisma.project.findMany({
      take: 200, select: { botToken: true, isActive: true } });
      const activeBotTokens = projects
        .filter(p => p.isActive && p.botToken)
        .map(p => {
          try { return CryptoService.decrypt(p.botToken!); } catch { return p.botToken!; }
        });

      if (activeBotTokens.includes(defaultToken)) {
        logger.info('--- ГЛАВНЫЙ БОТ УЖЕ ЗАПУЩЕН (через Проект в БД) ---');
      } else if (activeBotTokens.length > 0) {
        // There are active project bots, but none match the .env token.
        // This is likely an old "residual" token in .env.
        logger.warn('--- ПРОПУСК БОТА ИЗ .env: токен не найден в активных проектах БД ---');
        logger.warn('Чтобы запустить этот бот, добавьте его токен в настройки проекта в админ-панели.');
      } else {
        // No active projects with bots yet, allow .env as fallback/bootstrap
        bot.launch().then(() => {
          logger.info('--- ГЛАВНЫЙ БОТ ЗАПУЩЕН (.env token) ---');
        }).catch(e => {
          logger.error('ОШИБКА ЗАПУСКА ГЛАВНОГО БОТА:', e.message);
        });
      }
    }

    startBackgroundTasks();
    startWebhookServer();
  });
}

/**
 * --- GRACEFUL SHUTDOWN ---
 * Обработка сигналов завершения от ОС (Docker/PM2)
 */
import { stopAllWorkers } from '@/workers';

async function handleShutdown(signal: string) {
  logger.info(`--- СИГНАЛ ${signal} ПОЛУЧЕН. ПЛАВНАЯ ОСТАНОВКА ---`);
  
  try {
    // 1. Останавливаем все воркеры BullMQ
    await stopAllWorkers();
    
    // 2. Останавливаем основной бот
    if (bot) {
      logger.info('Остановка основного бота...');
      await bot.stop(signal);
    }
    
    // 3. Останавливаем все проектные боты из реестра
    const registry = BotRegistry.getAll();
    for (const [projectId, instance] of registry) {
      logger.info(`Остановка бота для проекта ${projectId}...`);
      await instance.stop(signal);
    }
    
    logger.info('--- ВСЕ ПРОЦЕССЫ УСПЕШНО ОСТАНОВЛЕНЫ. ВЫХОД. ---');
    process.exit(0);
  } catch (err) {
    logger.error('Ошибка при плавной остановке:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));


