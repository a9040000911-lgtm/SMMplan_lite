/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { Markup } from 'telegraf';
import { prisma } from '@/lib/prisma';
import { SessionService } from '@/services/core';
import { PricingService } from '@/services/finance';
import { UnifiedPaymentService } from '@/services/financial/unified-payment.service';
import { formatAmount } from '@/utils/formatter';
import { getProjectMenu } from '../utils/menu.utils';
import { RateLimiterService } from '../utils/rate-limiter';
import { escapeHtml } from '../utils/formatter';

export async function triggerOrderPreview(ctx: any, state: any) {
    const user = await prisma.user.findUnique({ where: { tgId: BigInt(ctx.from!.id) } });
    const service = await prisma.internalService.findUnique({ where: { id: state.serviceId } });
    if (!user || !service || !state.qty) return;
    const price = await PricingService.getServicePrice(service.id, ctx.project.id);
    const total = price.mul(state.qty).div(1000);
    let summary = `🧾 <b>ИТОГО: ${formatAmount(total)}₽</b>`;
    if (state.warning) {
        summary = `⚠️ <b>ОБРАТИТЕ ВНИМАНИЕ:</b>\n<i>${escapeHtml(state.warning)}</i>\n\n` + summary;
    }
    await ctx.reply(summary, { parse_mode: 'HTML', ...getProjectMenu(ctx.project), ...Markup.inlineKeyboard([[Markup.button.callback('🚀 ПОДТВЕРДИТЬ', 'confirm_order')]]) });
}

export async function handleConfirmOrder(ctx: any) {
    const userId = ctx.from?.id;
    const state = await SessionService.get(userId, ctx.project.id);
    if (!state?.serviceId || !state.qty) return ctx.answerCbQuery('❌ Сессия истекла');
    const user = await prisma.user.findUnique({ where: { tgId: BigInt(userId) } });
    const service = await prisma.internalService.findUnique({ where: { id: state.serviceId } });
    if (!user || !service) return ctx.answerCbQuery('Ошибка');
    const details = await PricingService.calculateOrderDetails(user.id, service.id, state.qty, ctx.project.id);
    if (user.balance.gte(details.finalPrice)) {
        await prisma.$transaction(async (tx) => {
            const updateResult = await tx.user.updateMany({ where: { id: user.id, balance: { gte: details.finalPrice } }, data: { balance: { decrement: details.finalPrice }, spent: { increment: details.finalPrice } } });
            if (updateResult.count === 0) {
                throw new Error('Insufficient funds or concurrent transaction conflict');
            }
            await tx.order.create({ data: { projectId: ctx.project.id, userId: user.id, internalServiceId: service.id, link: state.link!, quantity: state.qty!, totalPrice: details.finalPrice, status: 'PENDING' } });
        });
        await ctx.reply(`✅ <b>Заказ запущен!</b>`, { parse_mode: 'HTML', ...getProjectMenu(ctx.project) });
        await SessionService.delete(userId, ctx.project.id);
    } else {
        const amount = details.finalPrice.minus(user.balance).toNumber();
        const limit = await RateLimiterService.checkPaymentLinkLimit(userId!, ctx.project.id);
        if (!limit.allowed) {
            await ctx.reply('🛑 <b>Слишком много счетов.</b>\nМы приостановили создание платежей. Попробуйте снова через час.', { parse_mode: 'HTML' });
            return ctx.answerCbQuery();
        }

        // Используем централизованный backend service
        const res = await UnifiedPaymentService.createPayment(
            ctx.project.id,
            user.id,
            amount,
            `Заказ: ${service.name}`,
            {
                source: 'BOT',
                serviceId: service.id,
                qty: state.qty,
                link: state.link,
                isAutoOrder: true
            }
        );

        if (res.success && res.confirmationUrl) {
            let message = user.balance.eq(0)
                ? `💳 <b>СУММА К ОПЛАТЕ: ${formatAmount(amount)}₽</b>`
                : `💳 <b>НУЖНА ДОПЛАТА: ${formatAmount(amount)}₽</b>`;

            if (limit.attempts >= 28) {
                 message += `\n\n⚠️ <b>ПРЕДУПРЕЖДЕНИЕ:</b> Вы сгенерировали почти 30 неоплаченных счетов подряд. Во избежание блокировки приостановите покупки или перейдите на оплату с Внутреннего Баланса!`;
            } else if (limit.attempts >= 4) {
                 message += `\n\n💡 <b>Устали каждый раз вводить данные карты?</b>\nПополните Баланс один раз (через меню бота) и заказывайте любые услуги мгновенно в 1 клик!`;
            }

            await ctx.reply(message, { parse_mode: 'HTML', ...getProjectMenu(ctx.project), ...Markup.inlineKeyboard([[Markup.button.url('🚀 ОПЛАТИТЬ', res.confirmationUrl!), Markup.button.callback('❌ ОТМЕНА', 'cancel_order')]]) });
        }
    }
    await ctx.answerCbQuery();
}

export async function handleCancelOrder(ctx: any) {
    await SessionService.delete(ctx.from!.id, ctx.project.id);
    if (ctx.callbackQuery) {
        await ctx.editMessageText('❌ Заказ отменен.');
        await ctx.answerCbQuery();
    } else {
        await ctx.reply('❌ Заказ отменен.', getProjectMenu(ctx.project));
    }
}


