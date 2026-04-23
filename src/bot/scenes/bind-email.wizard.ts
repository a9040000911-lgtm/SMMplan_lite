/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { Scenes, Markup } from 'telegraf';
import { prisma } from '@/lib/prisma';
import { send2FACodeEmail } from '@/services/mail.service';
import { formatAmount } from '@/utils/formatter';
import { RateLimiterService } from '../utils/rate-limiter';

export const BIND_EMAIL_WIZARD = 'bind-email-wizard';

export const bindEmailWizard = new Scenes.WizardScene<any>(
    BIND_EMAIL_WIZARD,
    // Step 1: Request Email
    async (ctx) => {
        await ctx.reply('📧 <b>ПРИВЯЗКА EMAIL</b>\n────────────────────\nВведите ваш адрес электронной почты для синхронизации аккаунта:', {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([[Markup.button.callback('❌ Отмена', 'cancel_scene')]])
        });
        return ctx.wizard.next();
    },
    // Step 2: Validate Email and Send Code
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        const email = ctx.message.text.toLowerCase().trim();

        // Simple regex
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return ctx.reply('❌ <b>Некорректный формат почты.</b> Попробуйте еще раз:');
        }

        const randomValue = crypto.getRandomValues(new Uint32Array(1))[0];
        const code = (100000 + (randomValue % 900000)).toString(); // 6 digits

        ctx.wizard.state.email = email;
        ctx.wizard.state.code = code;

        // Anti-Spam Check
        const limit = await RateLimiterService.checkEmailLimit(ctx.from!.id, ctx.project.id);
        if (!limit.allowed) {
            return ctx.reply(`⚠️ Вы запрашивали код слишком часто. Пожалуйста, подождите ${(limit.remainingDelaySec / 60).toFixed(0)} минут.`, {
                ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'cancel_scene')]])
            });
        }

        if (limit.attempts === 4) {
            await ctx.reply('⚠️ <b>ПРЕДУПРЕЖДЕНИЕ:</b> Это ваша предпоследняя попытка привязки. При следующей ошибке функция отправки писем будет заблокирована на 10 минут из-за подозрений в спаме.', { parse_mode: 'HTML' });
        }

        await ctx.reply('⏳ <b>Отправляем код подтверждения...</b>', { parse_mode: 'HTML' });

        const mailRes = await send2FACodeEmail(email, code);
        if (!mailRes.success) {
            await ctx.reply('❌ <b>Ошибка отправки письма.</b> Проверьте адрес или попробуйте позже.', {
                ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Назад', 'cancel_scene')]])
            });
            return ctx.scene.leave();
        }

        await ctx.reply(`📩 Код отправлен на <b>${email}</b>. Введите 6-значный код из письма:`, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([[Markup.button.callback('❌ Отмена', 'cancel_scene')]])
        });
        return ctx.wizard.next();
    },
    // Step 3: Verify Code and Bind
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) return;
        const inputCode = ctx.message.text.trim();

        if (inputCode !== ctx.wizard.state.code) {
            return ctx.reply('❌ <b>Неверный код.</b> Попробуйте еще раз или нажмите Отмена:');
        }

        const email = ctx.wizard.state.email;
        const tgId = BigInt(ctx.from!.id);

        try {
            const emailUser = await prisma.user.findUnique({
                where: { email }
            });

            // Find current account by TG
            const tgUser = await prisma.user.findUnique({
                where: { tgId }
            });

            if (!emailUser) {
                // If account with this email doesn't exist, we just link email to current TG account
                if (tgUser) {
                    await prisma.user.update({
                        where: { id: tgUser.id },
                        data: { email }
                    });
                }
                await ctx.reply('✅ <b>Email успешно привязан!</b> Теперь вы можете входить на сайт, используя эту почту.', { parse_mode: 'HTML' });
            } else {
                // ACCOUNT MERGE LOGIC
                if (tgUser && tgUser.id !== emailUser.id) {
                    // Check if current TG user is "empty"
                    const hasOrders = await prisma.order.count({ where: { userId: tgUser.id } }) > 0;
                    if (tgUser.balance.gt(0) || hasOrders) {
                        return ctx.reply('⚠️ <b>У этого Telegram и Email разные балансы и заказы.</b>\nАвтоматическое объединение невозможно. Обратитесь в поддержку.', { parse_mode: 'HTML' });
                    }
                    // Delete empty TG user and bind TG to Email user
                    await prisma.user.delete({ where: { id: tgUser.id } });
                }

                await prisma.user.update({
                    where: { id: emailUser.id },
                    data: { tgId, username: ctx.from!.username || emailUser.username }
                });

                await ctx.reply(`🎊 <b>АККАУНТЫ ОБЪЕДИНЕНЫ!</b>\n────────────────────\nБаланс сайта и бота синхронизирован: <b>${formatAmount(emailUser.balance)}₽</b>`, { parse_mode: 'HTML' });
            }
        } catch (e) {
            console.error('Error in bindEmailWizard:', e);
            await ctx.reply('❌ Произошла ошибка при объединении аккаунтов. Обратитесь в поддержку.');
        }

        return ctx.scene.leave();
    }
);


