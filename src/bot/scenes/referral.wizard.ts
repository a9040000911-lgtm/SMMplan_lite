/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */

import { Scenes, Markup } from 'telegraf';
import { prisma } from '@/lib/prisma';
import { formatAmount } from '../../utils/formatter';
import { bot } from '@/services/bot/bot-registry';
import { LoyaltyService } from '@/services/users';

export const REFERRAL_WIZARD = 'referral-wizard';

export const referralWizard = new Scenes.WizardScene(
  REFERRAL_WIZARD,
  async (ctx: any) => {
    try {
      const userId = ctx.from.id;
      const user = await prisma.user.findUnique({
        where: {
          tgId: BigInt(userId)
        },
        include: { _count: { select: { referrals: true } } }
      });

      if (!user) {
        await ctx.reply('❌ Пользователь не найден.');
        return ctx.scene.leave();
      }

      const botUsername = ctx.botInfo.username;
      const refLink = `https://t.me/${botUsername}?start=${user.id.split('-')[0]}`;

      // Use LoyaltyService to get dynamic percent (Pioneers get 20%)
      const refPercent = await LoyaltyService.getReferralPercent(userId, ctx.project.id);
      const isPioneer = refPercent > 10; // Simple check, or check user.isEarlyBird

      const pioneerBadge = isPioneer ? '🔥 <b>PIONEER BOOST: 20% (x2)</b>\n' : '';

      const text =
        `🤝 <b>ПАРТНЕРСКАЯ ПРОГРАММА</b>\n────────────────────\n` +
        `${pioneerBadge}` +
        `Зарабатывайте <b>${refPercent}%</b> от каждого пополнения приглашенных вами друзей!\n\n` +
        `📊 <b>Ваша статистика:</b>\n` +
        `└ Приглашено: <b>${user._count.referrals} чел.</b>\n` +
        `└ Заработано: <b>${formatAmount(user.referralEarnings)}₽</b>\n` +
        `└ Текущий баланс: <b>${formatAmount(user.balance)}₽</b>\n\n` +
        `🔗 <b>Ваша ссылка для приглашения:</b>\n` +
        `<code>${refLink}</code>\n\n` +
        `<i>Просто отправьте эту ссылку другу, и он автоматически станет вашим рефералом после запуска бота.</i>`;

      const shareText = isPioneer
        ? `🔥 Я стал Первопроходцем в SMMPlan! Залетай по моей ссылке и получай бонусы, пока есть места: ${refLink}`
        : `Крутой бот для продвижения в соцсетях! Попробуй сам: ${refLink}`;

      await ctx.reply(text, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.url('🚀 Поделиться ссылкой', `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(shareText)}`)],
          [Markup.button.callback('📜 Правила', 'ref_rules')],
          [Markup.button.callback('🔙 Назад', 'leave_ref')]
        ])
      });
      return ctx.wizard.next();
    } catch (e) {
      console.error(e);
      await ctx.reply('❌ Ошибка при получении данных.');
      return ctx.scene.leave();
    }
  },
  async (_ctx: any) => {
    // Ждем действий пользователя
    return;
  }
);

referralWizard.action('ref_rules', async (ctx: any) => {
  const text =
    `📜 <b>ПРАВИЛА ПРОГРАММЫ:</b>\n────────────────────\n` +
    `1. Вы получаете процент от каждого пополнения баланса вашим рефералом.\n` +
    `2. Средства зачисляются мгновенно на ваш основной баланс.\n` +
    `3. Вы можете использовать заработанные деньги для заказа любых услуг или вывести их (через поддержку).\n` +
    `4. Запрещено использовать спам для распространения ссылки.\n\n` +
    `❓ <b>Как это работает?</b>\n` +
    `Когда человек переходит по вашей ссылке и нажимает "Старт", он навсегда закрепляется за вами.`;

  await ctx.editMessageText(text, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад к статистике', 'back_to_ref')]])
  });
});

referralWizard.action('back_to_ref', async (ctx: any) => {
  await ctx.answerCbQuery();
  return ctx.scene.enter(REFERRAL_WIZARD);
});

referralWizard.action('leave_ref', async (ctx: any) => {
  await ctx.answerCbQuery();
  await ctx.reply('🏠 Вы вернулись в главное меню.');
  return ctx.scene.leave();
});

// Глобальные команды и текст меню
referralWizard.command('start', (ctx: any) => ctx.scene.leave().then(() => ctx.reply('🔄 Возврат в главное меню...', Markup.removeKeyboard())));
referralWizard.hears(['🚀 Заказать', '📱 Магазин', '💼 Баланс', '📦 Мои заказы', '🆕 Новости', '👥 Рефералы', '📑 Каталог', 'ℹ️ Инфо', '🆘 Поддержка'], async (ctx: any) => {
  await ctx.scene.leave();
  return bot.handleUpdate(ctx.update);
});


