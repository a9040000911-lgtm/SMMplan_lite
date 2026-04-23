/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { Markup } from 'telegraf';
import { prisma } from '@/lib/prisma';

/**
 * /review command - Request to leave a review
 * Phase 10B: UGC Incentives
 */
export async function handleReviewCommand(ctx: any) {
    const userId = ctx.from!.id;

    const user = await prisma.user.findUnique({
        where: { tgId: BigInt(userId) }
    });

    if (!user) {
        return ctx.reply('❌ Пользователь не найден. Используйте /start для регистрации.');
    }

    // Find recent completed orders
    const recentOrders = await prisma.order.findMany({
        where: {
            userId: user.id,
            status: 'COMPLETED'
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { internalService: true }
    });

    if (recentOrders.length === 0) {
        return ctx.reply(
            '📦 <b>У вас пока нет завершенных заказов</b>\n\n' +
            'Отзыв можно оставить после выполнения хотя бы одного заказа.\n\n' +
            'Используйте /start чтобы сделать заказ.',
            { parse_mode: 'HTML' }
        );
    }

    // Check if user already left reviews for these orders
    const existingReviews = await prisma.review.findMany({
        where: {
            userId: user.id,
            orderId: { in: recentOrders.map((o: any) => o.id) }
        },
        take: 20
    });

    const reviewedOrderIds = new Set(existingReviews.map((r: any) => r.orderId));
    const ordersWithoutReview = recentOrders.filter((o: any) => !reviewedOrderIds.has(o.id));

    if (ordersWithoutReview.length === 0) {
        return ctx.reply(
            '✅ <b>Спасибо за ваши отзывы!</b>\n\n' +
            'Вы уже оставили отзывы на все недавние заказы.\n\n' +
            'Новые заказы появятся в списке после завершения.',
            { parse_mode: 'HTML' }
        );
    }

    const message = [
        '⭐ <b>ОСТАВИТЬ ОТЗЫВ</b>',
        '────────────────────',
        '',
        'Мы очень ценим ваше мнение! Оставьте отзыв о нашем сервисе и получите <b>бонус до 200₽</b> 💰',
        '',
        '<b>Как оставить отзыв:</b>',
        '1️⃣ Оцените сервис от 1 до 5 звезд ⭐',
        '2️⃣ Напишите текст отзыва (минимум 50 символов)',
        '3️⃣ Отправьте в чат',
        '',
        '<i>💡 Чем подробнее отзыв, тем выше вознаграждение!</i>',
        '',
        '────────────────────',
        '<b>Недавние заказы для отзыва:</b>',
        ''
    ];

    ordersWithoutReview.slice(0, 3).forEach((order: any, idx: number) => {
        const date = new Date(order.createdAt).toLocaleDateString('ru-RU');
        message.push(`${idx + 1}. ${order.internalService.name} (${date})`);
    });

    message.push('');
    message.push('📝 <i>Начните сообщение с оценки 1-5 звезд, затем текст отзыва</i>');
    message.push('Пример: <code>5 ⭐⭐⭐⭐⭐ Отличный сервис, все быстро...</code>');

    await ctx.reply(message.join('\n'), {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🔙 Главное меню', 'start')]
        ])
    });
}


