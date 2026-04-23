/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { Markup } from 'telegraf';
import { prisma } from '@/lib/prisma';
import { SessionService } from '@/services/core';
import { MassOrderService } from '@/services/core/mass-order.service';
import { formatAmount } from '@/utils/formatter';
import axios from 'axios';
import { escapeHtml } from '../utils/formatter';

export async function handleMassOrderCommand(ctx: any) {
    const userId = ctx.from.id;
    const projectId = ctx.project.id;

    await SessionService.set(userId, { isWaitingForMassOrder: true }, projectId);

    const msg =
        `📊 <b>МАССОВЫЙ ЗАКАЗ</b>\n────────────────────\n` +
        `Вы можете оформить сразу несколько заказов одним сообщением или файлом.\n\n` +
        `📝 <b>Способы ввода:</b>\n` +
        `1️⃣ <b>Текст:</b> Пришлите список в чат.\n` +
        `    <code>ID | ссылка | количество</code>\n` +
        `2️⃣ <b>Файл:</b> Загрузите <code>.txt</code> или <code>.csv</code> файл.\n\n` +
        `🚀 <b>Пришлите ваш список или файл:</b>`;

    await ctx.reply(msg, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[Markup.button.callback('❌ Отмена', 'cancel_mass_order')]])
    });
}

export async function handleMassOrderInput(ctx: any, _session: any) {
    const _userId = ctx.from.id;
    const projectId = ctx.project.id;
    const text = ctx.message.text;

    const entries = MassOrderService.parseText(text);
    return await showMassOrderPreview(ctx, entries, projectId);
}

export async function handleMassOrderFile(ctx: any, _session: any) {
    const _userId = ctx.from.id;
    const projectId = ctx.project.id;
    const doc = ctx.message.document;

    if (!doc.file_name.endsWith('.txt') && !doc.file_name.endsWith('.csv')) {
        return ctx.reply('❌ <b>Ошибка:</b> Поддерживаются только файлы <code>.txt</code> и <code>.csv</code>', { parse_mode: 'HTML' });
    }

    try {
        const fileLink = await ctx.telegram.getFileLink(doc.file_id);
        const response = await axios.get(fileLink.href);
        const content = response.data;

        if (typeof content !== 'string') throw new Error('Failed to read file content');

        const entries = MassOrderService.parseText(content);
        return await showMassOrderPreview(ctx, entries, projectId);
    } catch (error: any) {
        await ctx.reply(`❌ <b>Ошибка при чтении файла:</b> ${escapeHtml(error.message)}`, { parse_mode: 'HTML' });
    }
}

async function showMassOrderPreview(ctx: any, entries: any[], projectId: string) {
    const userId = ctx.from.id;

    if (entries.length === 0) {
        await ctx.reply('❌ <b>Ошибка:</b> Не удалось распознать ни одного заказа. Проверьте формат и попробуйте снова.', { parse_mode: 'HTML' });
        return;
    }

    try {
        const user = await prisma.user.findUnique({ where: { tgId: BigInt(userId) } });
        if (!user) throw new Error('User not found');

        const preview = await MassOrderService.validateMassOrder(user.id, projectId, entries);

        await SessionService.set(userId, {
            isWaitingForMassOrder: false,
            massOrderEntries: entries
        }, projectId);

        const previewMsg =
            `📋 <b>ПОДТВЕРЖДЕНИЕ ЗАКАЗА</b>\n────────────────────\n` +
            `📦 Всего позиций: <b>${preview.validatedEntries.length}</b>\n` +
            `💰 Итого к оплате: <b>${formatAmount(preview.totalBatchAmount)}₽</b>\n` +
            `💳 Ваш баланс: <b>${formatAmount(user.balance)}₽</b>\n\n` +
            (preview.hasSufficientBalance
                ? `✅ Нажмите кнопку ниже для оплаты.`
                : `⚠️ <b>Недостаточно средств на балансе!</b>`);

        const buttons = [];
        if (preview.hasSufficientBalance) {
            buttons.push([Markup.button.callback('💳 Оплатить и запустить', 'confirm_mass_order')]);
        } else {
            buttons.push([Markup.button.callback('💳 Пополнить баланс', 'deposit_start')]);
        }
        buttons.push([Markup.button.callback('❌ Отмена', 'cancel_mass_order')]);

        await ctx.reply(previewMsg, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard(buttons)
        });
    } catch (error: any) {
        await ctx.reply(`❌ <b>Ошибка:</b> ${escapeHtml(error.message)}`, { parse_mode: 'HTML' });
    }
}

export async function handleConfirmMassOrder(ctx: any) {
    const userId = ctx.from.id;
    const projectId = ctx.project.id;
    const session = await SessionService.get(userId, projectId);

    if (!session?.massOrderEntries) {
        return ctx.answerCbQuery('❌ Ошибка: сессия истекла. Попробуйте еще раз.');
    }

    try {
        const user = await prisma.user.findUnique({ where: { tgId: BigInt(userId) } });
        if (!user) throw new Error('User not found');

        await ctx.editMessageText('⏳ <b>Обработка заказов...</b>', { parse_mode: 'HTML' }).catch(() => { });

        const result = await MassOrderService.processMassOrder(user.id, projectId, session.massOrderEntries);

        await SessionService.delete(userId, projectId);

        const successMsg =
            `✅ <b>МАССРОВЫЙ ЗАКАЗ ПРИНЯТ!</b>\n────────────────────\n` +
            `📦 Создано заказов: <b>${result.orderCount}</b>\n` +
            `💰 Итого списано: <b>${formatAmount(result.totalAmount)}₽</b>\n` +
            `🆔 Batch ID: <code>${result.batchId.split('-')[0].toUpperCase()}</code>\n\n` +
            `<i>Заказы уже отправлены в обработку.</i>`;

        await ctx.editMessageText(successMsg, { parse_mode: 'HTML' });
    } catch (error: any) {
        await ctx.reply(`❌ <b>Ошибка:</b> ${escapeHtml(error.message)}`, { parse_mode: 'HTML' });
    }
}


