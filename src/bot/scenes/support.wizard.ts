/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { Scenes, Markup } from 'telegraf';
import { prisma } from '@/lib/prisma';
import { BroadcastService, TicketVerificationService } from '@/services/support';
import { bot } from '@/services/bot/bot-registry';
import { SessionService, UserState } from '@/services/core';
import { escapeHtml } from '../utils/formatter';
import { createLogger } from '@/lib/logger';

const logger = createLogger('SupportWizard');

export const SUPPORT_WIZARD = 'support-wizard';

export const supportWizard = new Scenes.WizardScene(
    SUPPORT_WIZARD,
    // ШАГ 1: Выбор категории проблемы
    async (ctx: any) => {
        const tgId = ctx.from.id;
        
        // Anti-Spam: Blocks multiple active conversations
        const user = await prisma.user.findUnique({ where: { tgId: BigInt(tgId) }, select: { id: true, role: true } });
        if (user && user.role !== 'ADMIN' && user.role !== 'SEO') {
            const openTicket = await prisma.supportTicket.findFirst({
                where: { userId: user.id, status: 'OPEN' }
            });
            if (openTicket) {
                await ctx.reply(`⚠️ <b>У вас уже есть открытое обращение (#${openTicket.id.split('-')[0].toUpperCase()}).</b>\n\nПожалуйста, дождитесь ответа службы поддержки или закройте текущий тикет в Личном кабинете сайте.`, { parse_mode: 'HTML' });
                return ctx.scene.leave();
            }
        }

        // Проверяем, пришел ли пользователь по конкретному заказу
        const orderId = ctx.scene.state?.orderId;
        if (orderId) {
            ctx.wizard.state.supportData = {
                subject: 'Проблема с заказом',
                orderId: orderId
            };
            await ctx.reply(`📝 <b>Тикет по заказу #${orderId}</b>\n\nПожалуйста, опишите, что именно пошло не так. Мы уже знаем ID вашего заказа и готовы помочь.`, { parse_mode: 'HTML' });
            return ctx.wizard.next();
        }

        await ctx.reply(
            '🆘 <b>ЦЕНТР ПОДДЕРЖКИ</b>\n────────────────────\nВыберите тему обращения:',
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('📦 Проблема с заказом', 'sub_order')],
                    [Markup.button.callback('💳 Проблема с оплатой', 'sub_payment')],
                    [Markup.button.callback('🐞 Нашел баг (Акция)', 'sub_bug')],
                    [Markup.button.callback('💡 Запрос услуги', 'sub_feature')],
                    [Markup.button.callback('🧩 Другой вопрос', 'sub_other')],
                    [Markup.button.callback('❌ Отмена', 'cancel_support')]
                ])
            }
        );
        return ctx.wizard.next();
    },
    // ШАГ 2: Описание проблемы
    async (ctx: any) => {
        // Если пользователь нажал на кнопку из Шага 1
        if (ctx.callbackQuery) {
            const subjectMap: any = {
                'sub_order': 'Проблема с заказом',
                'sub_payment': 'Проблема с оплатой',
                'sub_other': 'Общий вопрос',
                'sub_bug': '[BUG_HUNTER] Сообщение о ошибке',
                'sub_feature': '[FEATURE] Запрос услуги'
            };
            ctx.wizard.state.supportData = { subject: subjectMap[ctx.callbackQuery.data] || 'Тикет' };
            await ctx.answerCbQuery();
            await ctx.editMessageText(`📝 <b>Тема: ${ctx.wizard.state.supportData.subject}</b>\n\nПожалуйста, опишите вашу проблему максимально подробно.\nВы также можете прикрепить 1 фото (скриншот) или отправить голосовое сообщение.`, { parse_mode: 'HTML' });
            return; // Остаемся на этом шаге, ждем текст
        }

        // Если пришел текст, фото или голосовое
        const text = ctx.message?.text || ctx.message?.caption || '';
        const photoId = ctx.message?.photo ? ctx.message.photo[ctx.message.photo.length - 1].file_id : null;
        const voiceId = ctx.message?.voice?.file_id || ctx.message?.audio?.file_id || null;

        if (!text && !photoId && !voiceId) {
            return ctx.reply('Пожалуйста, введите описание текстом или отправьте голосовое/фото.');
        }

        ctx.wizard.state.supportData.text = text;
        ctx.wizard.state.supportData.photoId = photoId;
        ctx.wizard.state.supportData.voiceId = voiceId;

        await ctx.reply(
            `✅ <b>ВАШЕ ОБРАЩЕНИЕ СФОРМИРОВАНО</b>\n────────────────────\n` +
            `📝 Тема: ${ctx.wizard.state.supportData.subject}\n` +
            `💬 Сообщение: ${escapeHtml(text ? text.substring(0, 100) + (text.length > 100 ? '...' : '') : '(без текста)')}\n` +
            `${photoId ? '📸 Скриншот прикреплен\n' : ''}` +
            `${voiceId ? '🎙️ Голосовое прикреплено\n' : ''}` +
            `────────────────────\n` +
            `Отправить тикет специалисту?`,
            {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🚀 ОТПРАВИТЬ', 'submit_ticket')],
                    [Markup.button.callback('❌ ОТМЕНА', 'cancel_support')]
                ])
            }
        );
        return ctx.wizard.next();
    },
    // ШАГ 3: Финализация
    async (_ctx: any) => {
        return; // Ждем callback
    }
);

supportWizard.action('submit_ticket', async (ctx: any) => {
    const { subject, text, photoId, voiceId } = ctx.wizard.state.supportData;
    const tgId = ctx.from.id;

    try {
        const user = await prisma.user.findUnique({
            where: {
                tgId: BigInt(tgId)
            }
        });
        if (!user) return ctx.scene.leave();

        // 1. Создаем тикет в БД
        const ticket = await prisma.supportTicket.create({
            data: {
                projectId: ctx.project.id,
                userId: user.id,
                subject: subject,
                status: 'OPEN',
                messages: {
                    create: {
                        sender: 'USER',
                        text: text || '',
                        imageUrl: photoId,
                        voiceUrl: voiceId as string // Сохраняем voice Id
                    } as any
                }
            }
        });

        // 2. ✨ Автоматическая верификация тикета
        const verification = await TicketVerificationService.autoVerify(ticket.id);

        // 3. Устанавливаем статус поддержки в сессии
        const currentState = await SessionService.get(tgId, ctx.project.id) || {} as UserState;
        await SessionService.set(tgId, {
            ...currentState,
            activeTicketId: ticket.id,
            isWaitingForSupport: true
        }, ctx.project.id);

        // 4. Уведомляем админа
        const mediaTag = voiceId ? ' 🎙️' : photoId ? ' 📷' : '';
        const verifiedTag = verification.verified ? ' ✅' : '';
        const orderInfo = ctx.wizard.state.supportData.orderId ? `\n📦 <b>Заказ:</b> <code>#${ctx.wizard.state.supportData.orderId}</code>` : '';

        await BroadcastService.notifyAdmin(
            `📩 <b>НОВЫЙ ТИКЕТ #${ticket.id.split('-')[0].toUpperCase()}</b>${mediaTag}${verifiedTag}\n` +
            `👤 Юзер: @${ctx.from.username || 'user'}\n` +
            `📝 Тема: ${escapeHtml(subject)}${orderInfo}\n` +
            (verification.verified ? `🔗 Верифицирован (${verification.method})\n` : '') +
            `\n💬 ${escapeHtml(text || (voiceId ? '(голос)' : '(скрин)'))}`
        );

        if (photoId) {
            // В будущем можно переслать фото админу напрямую
        }

        // 5. Сообщаем пользователю о результате
        let successMessage = '✅ <b>Ваше сообщение отправлено!</b>\n';
        if (verification.verified) {
            successMessage += '🔗 <i>Тикет автоматически связан с вашим аккаунтом.</i>\n';
        }
        successMessage += 'Специалист ответит вам в ближайшее время. Вы получите уведомление в этом чате.';

        await ctx.editMessageText(successMessage, { parse_mode: 'HTML' });
    } catch (e) {
        logger.error('Error creating support ticket', e);
        await ctx.reply('❌ Ошибка при создании тикета. Напишите нам позже.');
    }
    return ctx.scene.leave();
});

supportWizard.action('cancel_support', async (ctx: any) => {
    await ctx.answerCbQuery();
    await ctx.reply('❌ Обращение в поддержку отменено.');
    return ctx.scene.leave();
});

// Глобальные команды и текст меню
supportWizard.command('start', (ctx: any) => ctx.scene.leave().then(() => ctx.reply('🔄 Возврат в главное меню...', Markup.removeKeyboard())));
supportWizard.hears(['🚀 Заказать', '📱 Магазин', '💼 Баланс', '📦 Мои заказы', '🆕 Новости', '👥 Рефералы', '📑 Каталог', 'ℹ️ Инфо', '🆘 Поддержка'], async (ctx: any) => {
    await ctx.scene.leave();
    return bot.handleUpdate(ctx.update);
});


