/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { prisma } from '@/lib/prisma';
import { ManagedChannelService } from '@/services/vip/managed-channel.service';

export function registerGuardianHandlers(bot: any) {
    /**
     * Команда /guardian - основной вход в систему VIP Guardian.
     * Позволяет привязать канал к аккаунту для точного мониторинга.
     */
    bot.command('guardian', async (ctx: any) => {
        const userId = ctx.from?.id;
        const projectId = ctx.project.id;
        const text = ctx.message.text.split(' ');

        // 1. Если команда без аргументов в ЛС
        if (ctx.chat.type === 'private' && text.length === 1) {
            return ctx.reply(
                `🛡 <b>VIP Guardian: Система точного мониторинга</b>\n\n` +
                `Чтобы активировать высокоточный мониторинг через Bot API:\n\n` +
                `1️⃣ Добавьте этого бота в администраторы вашего канала.\n` +
                `2️⃣ Пришлите команду: <code>/guardian @username</code> (или перешлите пост из канала).\n\n` +
                `✨ <i>Это обеспечит 100% точность выполнения закрытых заказов и безопасность вашего канала.</i>`,
                { parse_mode: 'HTML' }
            );
        }

        // 2. Определение целевого канала
        let chatIdentifier: string | number | undefined;
        if (text.length > 1) {
            chatIdentifier = text[1];
        } else if (ctx.chat.type !== 'private') {
            chatIdentifier = ctx.chat.id;
        }

        if (!chatIdentifier) return ctx.reply('❌ Укажите @username канала или используйте команду внутри канала.');

        await ctx.reply('⏳ Проверяю права доступа...');

        try {
            // Ищем пользователя в БД
            const dbUser = await prisma.user.findUnique({
                where: { tgId: BigInt(userId) }
            });

            if (!dbUser) throw new Error('Пользователь не найден в системе');

            // Регистрируем канал
            const channel = await ManagedChannelService.registerChannel(
                dbUser.id,
                projectId,
                chatIdentifier,
                userId
            );

            await ctx.reply(
                `✅ <b>VIP Guardian Активирован!</b>\n\n` +
                `Канал: <b>${channel.title || channel.username || chatIdentifier}</b>\n` +
                `ID: <code>${channel.chatId}</code>\n\n` +
                `🚀 Теперь все заказы на этот канал будут мониториться с максимальной точностью напрямую через Telegram.`,
                { parse_mode: 'HTML' }
            );
        } catch (err: any) {
            console.error('[Guardian] Handler error:', err);
            await ctx.reply(`❌ <b>Ошибка активации:</b>\n${err.message}`, { parse_mode: 'HTML' });
        }
    });

    /**
     * Обработка события добавления бота в администраторы.
     * Предлагает активировать Guardian, если бот видит, что его повысили.
     */
    bot.on('my_chat_member', async (ctx: any) => {
        const newStatus = ctx.myChatMember.new_chat_member.status;
        const oldStatus = ctx.myChatMember.old_chat_member.status;

        if (newStatus === 'administrator' && oldStatus !== 'administrator') {
            if (ctx.chat.type === 'channel' || ctx.chat.type === 'supergroup') {
                await ctx.reply(
                    `👋 <b>Привет! Я вижу, меня добавили в администраторы.</b>\n\n` +
                    `Хотите активировать систему <b>VIP Guardian</b> для этого канала?\n` +
                    `Это позволит отслеживать статистику заказов со 100% точностью.\n\n` +
                    `👉 Введите команду <code>/guardian</code> для подтверждения.`,
                    { parse_mode: 'HTML' }
                ).catch(() => { });
            }
        }
    });
}


