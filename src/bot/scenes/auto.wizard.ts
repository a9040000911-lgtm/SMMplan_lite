/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */

import { Scenes, Markup, Composer } from 'telegraf';
import { prisma } from '@/lib/prisma';
import { LinkService } from '@/services/providers';
import { categoryNames } from '../utils/menu.utils';
import { escapeHtml } from '../utils/formatter';

export const AUTO_WIZARD = 'auto-wizard';

// --- Step 1: Platform Selection ---
const step1_platform = new Composer<Scenes.WizardContext>();
step1_platform.action(/^auto_plt_(.+)$/, async (ctx: any) => {
  const slug = ctx.match[1];
  const socialPlatform = await prisma.socialPlatform.findUnique({ where: { slug } });

  ctx.wizard.state.autoData = {
    platformSlug: slug,
    platformName: socialPlatform?.name || slug
  };

  const services = await prisma.internalService.findMany({
    where: { socialPlatform: { slug }, isActive: true, categoryId: { not: null } },
    take: 50,
    include: { serviceCategory: true }
  });

  // Deduplicate by categoryType
  const seenCategories = new Map<string, string>();
  for (const s of services) {
    if (s.serviceCategory && !seenCategories.has(s.serviceCategory.categoryType)) {
      seenCategories.set(s.serviceCategory.categoryType, s.serviceCategory.categoryType);
    }
  }
  const uniqueCategories = Array.from(seenCategories.keys());

  const buttons = uniqueCategories.map(cat => [Markup.button.callback(categoryNames[cat] || cat, `auto_cat_${cat}`)]);
  buttons.push([Markup.button.callback('🔙 Назад', 'back_to_start')]);

  await ctx.editMessageText(`📂 <b>${escapeHtml(ctx.wizard.state.autoData.platformName)}</b>\nВыберите категорию услуг:`, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(buttons)
  });
  return ctx.wizard.next();
});

// --- Step 2: Category Selection ---
const step2_category = new Composer<Scenes.WizardContext>();
step2_category.action('back_to_start', async (ctx: any) => {
  await ctx.answerCbQuery();
  ctx.wizard.selectStep(0);
  return (ctx.wizard as any).executeStep(ctx); // telegraf 4.x internal step trigger
});

step2_category.action(/^auto_cat_(.+)$/, async (ctx: any) => {
  const category = ctx.match[1];
  const { platformSlug } = ctx.wizard.state.autoData;
  ctx.wizard.state.autoData.category = category;

  const svcs = await prisma.internalService.findMany({
      take: 200,
    where: { socialPlatform: { slug: platformSlug }, serviceCategory: { categoryType: category as any }, isActive: true },
    orderBy: { pricePer1000: 'asc' }
  });

  const buttons = svcs.map(s => [Markup.button.callback(`${s.name}`, `auto_svc_${s.id}`)]);
  buttons.push([Markup.button.callback('🔙 Назад', 'back_to_plt')]);

  await ctx.editMessageText('🚀 <b>Выберите тариф для авто-запуска:</b>', {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(buttons)
  });
  return ctx.wizard.next();
});

// --- Step 3: Service Selection ---
const step3_service = new Composer<Scenes.WizardContext>();
step3_service.action('back_to_plt', async (ctx: any) => {
  await ctx.answerCbQuery();
  ctx.wizard.selectStep(0);
  return (ctx.wizard as any).executeStep(ctx);
});

step3_service.action(/^auto_svc_(.+)$/, async (ctx: any) => {
  const serviceId = ctx.match[1];
  const service = await prisma.internalService.findUnique({ where: { id: serviceId } });
  if (!service) return ctx.answerCbQuery('Ошибка');

  ctx.wizard.state.autoData.serviceId = serviceId;
  ctx.wizard.state.autoData.minQty = service.minQty;
  ctx.wizard.state.autoData.maxQty = service.maxQty;

  await ctx.editMessageText(
    `⌨️ <b>Введите количество для каждого поста:</b>\n` +
    `<i>(Доступно от ${service.minQty} до ${service.maxQty})</i>`,
    { parse_mode: 'HTML' }
  );
  return ctx.wizard.next();
});

// --- Step 4: Qty Input ---
const step4_qty = new Composer<Scenes.WizardContext>();
step4_qty.on('text', async (ctx: any) => {
  const qty = parseInt(ctx.message.text);
  const state = ctx.wizard.state.autoData;
  if (!state) return ctx.scene.leave();

  if (isNaN(qty) || qty < state.minQty || qty > state.maxQty) {
    return ctx.reply(`❌ Введите число от ${state.minQty} до ${state.maxQty}:`);
  }
  state.quantity = qty;
  await ctx.reply('🔗 <b>Пришлите ссылку на канал/профиль:</b>\n<i>(Бот будет следить за новыми постами по этой ссылке)</i>', { parse_mode: 'HTML' });
  return ctx.wizard.next();
});

// --- Step 5: Link Input ---
const step5_link = new Composer<Scenes.WizardContext>();
step5_link.on('text', async (ctx: any) => {
  const link = ctx.message.text.trim();
  const ana = LinkService.analyze(link);
  if (!ana) return ctx.reply('❌ Ссылка не распознана. Попробуйте еще раз:');

  ctx.wizard.state.autoData.link = link;
  await ctx.reply('🔢 <b>На сколько постов активировать мониторинг?</b>\n<i>(Например: 50)</i>', { parse_mode: 'HTML' });
  return ctx.wizard.next();
});

// --- Step 6: Posts Limit ---
const step6_limit = new Composer<Scenes.WizardContext>();
step6_limit.on('text', async (ctx: any) => {
  const limit = parseInt(ctx.message.text);
  if (isNaN(limit) || limit < 1 || limit > 1000) return ctx.reply('❌ Введите число от 1 до 1000:');
  ctx.wizard.state.autoData.postsLimit = limit;

  await ctx.reply(
    '⏱ <b>Задержка перед началом накрутки:</b>\n\n' +
    'Через сколько минут после выхода поста начинать накрутку?\n' +
    '<i>(0 = немедленно)</i>',
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('⚡ 0 мин', 'auto_delay_0'), Markup.button.callback('10 мин', 'auto_delay_10')],
        [Markup.button.callback('30 мин', 'auto_delay_30'), Markup.button.callback('60 мин', 'auto_delay_60')],
      ])
    }
  );
  return ctx.wizard.next();
});

// --- Step 7: Delay ---
const step7_delay = new Composer<Scenes.WizardContext>();
step7_delay.action(/^auto_delay_(\d+)$/, async (ctx: any) => {
  const delay = parseInt(ctx.match[1]);
  ctx.wizard.state.autoData.delayMinutes = delay;
  await ctx.answerCbQuery();
  await showAutoConfirmation(ctx);
  return ctx.wizard.next();
});
step7_delay.on('text', async (ctx: any) => {
  const delay = parseInt(ctx.message.text);
  if (isNaN(delay) || delay < 0 || delay > 1440) return ctx.reply('❌ Введите число (минуты):');
  ctx.wizard.state.autoData.delayMinutes = delay;
  await showAutoConfirmation(ctx);
  return ctx.wizard.next();
});

// --- Step 8: Confirm ---
const step8_confirm = new Composer<Scenes.WizardContext>();
step8_confirm.action('confirm_auto', async (ctx: any) => {
  const state = ctx.wizard.state.autoData;
  const userId = ctx.from!.id;

  const user = await prisma.user.findUnique({
    where: { tgId: BigInt(userId) }
  });

  if (!user) return ctx.scene.leave();

  await prisma.autoMonitoring.create({
    data: {
      projectId: ctx.project.id,
      userId: user.id,
      internalServiceId: state.serviceId,
      link: state.link,
      quantity: state.quantity,
      postsLimit: state.postsLimit,
      delayMinutes: state.delayMinutes ?? 0,
      isActive: true
    }
  });

  await ctx.editMessageText('🚀 <b>АВТО-ПИЛОТ ЗАПУЩЕН!</b>\n\nБот начал следить за каналом.', { parse_mode: 'HTML' });
  return ctx.scene.leave();
});

// --- The Scene ---
export const autoWizard = new Scenes.WizardScene(
  AUTO_WIZARD,
  // Step 0: Initial prompt
  async (ctx: any) => {
    const text = `🤖 <b>АВТО-ПИЛОТ (Мониторинг)</b>\n────────────────────\nВыберите платформу:`;
    const platforms = await prisma.socialPlatform.findMany({
      take: 200,
      where: { isActive: true, internalServices: { some: { isActive: true } } },
      orderBy: { slug: 'asc' }
    });
    const buttons = platforms.map(p => [Markup.button.callback(p.icon ? `${p.icon} ${p.name}` : p.name, `auto_plt_${p.slug}`)]);
    buttons.push([Markup.button.callback('❌ Отмена', 'cancel_wizard')]);

    await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    return ctx.wizard.next();
  },
  step1_platform,
  step2_category,
  step3_service,
  step4_qty,
  step5_link,
  step6_limit,
  step7_delay,
  step8_confirm
);

// Global actions for the scene
autoWizard.action('cancel_wizard', async (ctx: any) => {
  await ctx.answerCbQuery();
  await ctx.reply('❌ Настройка отменена.');
  return ctx.scene.leave();
});

/**
 * Вспомогательная функция для показа финального экрана подтверждения
 */
async function showAutoConfirmation(ctx: any) {
  const state = ctx.wizard.state.autoData;
  const service = await prisma.internalService.findUnique({ where: { id: state.serviceId } });
  const delayLabel = !state.delayMinutes || state.delayMinutes === 0 ? 'Немедленно' : `${state.delayMinutes} мин`;
  const text =
    `✅ <b>ПОДТВЕРДИТЕ НАСТРОЙКУ</b>\n────────────────────\n` +
    `🏷 Услуга: ${escapeHtml(service?.name || '')}\n` +
    `🔗 Канал: ${escapeHtml(state.link)}\n` +
    `🔢 Кол-во: ${state.quantity}/пост\n` +
    `📅 Лимит: ${state.postsLimit} постов\n` +
    `⏱ Задержка: ${delayLabel}`;

  await ctx.reply(text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🚀 ЗАПУСТИТЬ', 'confirm_auto')],
      [Markup.button.callback('❌ Отмена', 'cancel_wizard')]
    ])
  });
}


