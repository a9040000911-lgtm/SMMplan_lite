/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { Scenes, Markup } from 'telegraf';
import { prisma } from '@/lib/prisma';
import { formatAmount } from '@/utils/formatter';
import { UnifiedPaymentService } from '@/services/financial/unified-payment.service';
import { RateLimiterService } from '../utils/rate-limiter';

export const DEPOSIT_WIZARD = 'deposit-wizard';

export const depositWizard = new Scenes.WizardScene(
    DEPOSIT_WIZARD,
    // ШАГ 1: Запрос суммы
    async (ctx: any) => {
        await ctx.reply(
            '💳 <b>ПОПОЛНЕНИЕ БАЛАНСА</b>\n────────────────────\n' +
            'Введите сумму пополнения в рублях:',
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([[Markup.button.callback('❌ Отмена', 'cancel_deposit')]])
            }
        );
        return ctx.wizard.next();
    },
    // ШАГ 2: Генерация счета
    async (ctx: any) => {
        if (!ctx.message?.text) return ctx.reply('Пожалуйста, введите сумму числом.');

        const amount = parseFloat(ctx.message.text.replace(',', '.'));

        if (isNaN(amount) || amount < 1) {
            return ctx.reply('❌ <b>Минимальная сумма — 1₽.</b>\nПопробуйте еще раз:');
        }

        if (amount > 50000) {
            return ctx.reply('❌ <b>Максимальная сумма разового пополнения — 50,000₽.</b>\nВведите меньшую сумму:');
        }

        const tgId = ctx.from.id;
        const user = await prisma.user.findUnique({
            where: {
                tgId: BigInt(tgId)
            }
        });
        if (!user) return ctx.scene.leave();

        await ctx.reply('⏳ <i>Генерируем защищенную ссылку на оплату...</i>', { parse_mode: 'HTML' });

        const limit = await RateLimiterService.checkPaymentLinkLimit(user.id, ctx.project.id);
        if (!limit.allowed) {
            return ctx.reply('🛑 <b>Слишком много запросов на оплату подряд.</b>\nМы приостановили создание новых счетов для защиты от мошенничества. Попробуйте снова через час.', { parse_mode: 'HTML' });
        }

        try {
            // Используем централизованный backend service
            const payment = await UnifiedPaymentService.createPayment(
                ctx.project.id,
                user.id,
                amount,
                `Пополнение баланса @${ctx.from.username || tgId}`,
                { source: 'BOT' }
            );

            if (payment.success && payment.confirmationUrl) {
                await ctx.reply(
                    `✅ <b>СЧЕТ СФОРМИРОВАН</b>\n────────────────────\n` +
                    `Сумма: <b>${formatAmount(amount)}₽</b>\n` +
                    `Способ: <b>Банковская карта / СБП</b>\n────────────────────\n` +
                    `<i>Нажмите на кнопку ниже, чтобы перейти к оплате. Баланс будет зачислен автоматически после подтверждения.</i>`,
                    {
                        parse_mode: 'HTML',
                        ...Markup.inlineKeyboard([
                            [Markup.button.url('💳 ОПЛАТИТЬ КАРТОЙ', payment.confirmationUrl)],
                            [Markup.button.callback('❌ Отмена', 'cancel_deposit')]
                        ])
                    }
                );
                
                if (limit.attempts >= 28) {
                    await ctx.reply('⚠️ <b>ПРЕДУПРЕЖДЕНИЕ:</b> Вы достигли лимита (почти 30 счетов подряд). Если вы создадите еще пару счетов, бот временно заблокирует платежную функцию.', { parse_mode: 'HTML' });
                }
            } else {
                throw new Error(payment.error || 'Payment creation failed');
            }

        } catch (error) {
            console.error('[Deposit Wizard] Payment error:', error);
            await ctx.reply(
                '❌ <b>Ошибка создания платежа</b>\n\n' +
                '<i>Платежная система временно недоступна. Попробуйте позже или обратитесь в поддержку.</i>',
                { parse_mode: 'HTML' }
            );
        }

        return ctx.scene.leave();
    }
);

depositWizard.action('cancel_deposit', async (ctx: any) => {
    try {
        await ctx.answerCbQuery();
        await ctx.reply('❌ Пополнение отменено.', { parse_mode: 'HTML' });
        return ctx.scene.leave();
    } catch (e) {
        console.error('[Deposit Cancel]', e);
    }
});

depositWizard.command('cancel', (ctx: any) => {
    ctx.reply('❌ Пополнение отменено.');
    return ctx.scene.leave();
});

// Глобальные команды и текст меню
depositWizard.command('start', (ctx: any) => ctx.scene.leave().then(() => ctx.reply('🔄 Возврат в главное меню...', Markup.removeKeyboard())));
depositWizard.hears(['🚀 Заказать', '📱 Магазин', '💼 Баланс', '📦 Мои заказы', '🆕 Новости', '👥 Рефералы', '📑 Каталог', 'ℹ️ Инфо', '🆘 Поддержка'], async (ctx: any) => {
    return ctx.scene.leave();
});


