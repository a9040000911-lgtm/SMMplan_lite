/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { escapeHtml } from './formatter';

/**
 * Централизованное хранилище шаблонов сообщений для Telegram бота.
 * Позволяет изменять тексты уведомлений в одном месте.
 */
export const NotificationTemplates = {
    ORDER: {
        CREATED_USER: (orderId: number | string, serviceName: string) =>
            `📥 <b>Заказ принят в обработку!</b>\n\n` +
            `Услуга: ${escapeHtml(serviceName)}\n` +
            `ID: <code>${orderId}</code>\n\n` +
            `<i>Запуск обычно занимает от 5 до 60 минут. О завершении мы пришлем уведомление.</i>`,

        CREATED_ADMIN: (projectName: string, username: string, serviceName: string, amount: string, link: string, qty: number) =>
            `🆕 <b>НОВЫЙ ЗАКАЗ [${escapeHtml(projectName)}]</b>\n` +
            `👤 Юзер: @${escapeHtml(username)}\n` +
            `🏷 Услуга: ${escapeHtml(serviceName)}\n` +
            `🔗 Ссылка: <code>${escapeHtml(link)}</code>\n` +
            `🔢 Кол-во: ${qty}\n` +
            `💰 Сумма: ${amount}₽`,

        MARGING_GUARD_ADMIN: (serviceName: string, serviceId: string, liveUnit: string, myUnit: string, reqUnit: string) =>
            `🚨 <b>CRITICAL: MARGIN GUARD TRIGGERED</b>\n\n` +
            `Service: ${escapeHtml(serviceName)}\n` +
            `ID: <code>${escapeHtml(serviceId)}</code>\n\n` +
            `❌ <b>Провайдер резко поднял цены!</b>\n` +
            `• Текущая закупка: <b>${escapeHtml(liveUnit)}₽/шт.</b>\n` +
            `• Ваша цена: <b>${escapeHtml(myUnit)}₽/шт.</b>\n` +
            `• Требуемый мин: <b>${escapeHtml(reqUnit)}₽/шт.</b>\n\n` +
            `<i>Услуга была ОТКЛЮЧЕНА автоматически для предотвращения убытков.</i>`,
        CANCELLED_USER_GENERIC: (orderId: number | string) =>
            `⚠️ <b>Ошибка при запуске заказа</b>\n\n` +
            `Заказ <code>#${orderId}</code> не может быть запущен из-за временного технического сбоя на стороне сервиса.\n\n` +
            `💰 <b>Средства автоматически возвращены на ваш баланс.</b>\n\n` +
            `<i>Пожалуйста, попробуйте выбрать другую аналогичную услугу или обратитесь в поддержку для уточнения деталей.</i>`,

        PARTIAL_USER_GENERIC: (orderId: number | string, statusLabel: string) =>
            `❌ <b>Заказ: ${escapeHtml(statusLabel)}</b>\n\n` +
            `Заказ <code>#${orderId}</code> был выполнен частично или отменен из-за программного ограничения.\n\n` +
            `💰 <b>Средства за невыполненную часть возвращены на ваш баланс.</b>`,

        PROCESSING_USER: (orderId: number | string, serviceName: string) =>
            `⚙️ <b>ЗАКАЗ ПРИНЯТ В РАБОТУ</b>\n────────────────────\n` +
            `📦 <b>ID:</b> <code>#${orderId}</code>\n` +
            `🏷 <b>Услуга:</b> ${escapeHtml(serviceName)}\n\n` +
            `<i>Запуск обычно занимает от 5 до 60 минут. О завершении мы пришлем уведомление.</i>`,

        REFILL_SUCCESS_ADMIN: (orderId: number, provider1: string, provider2: string, lossMsg: string) =>
            `♻️ <b>AUTO-REFILL SUCCESS</b>\n\n` +
            `Заказ <code>#${orderId}</code> автоматически перезапущен.\n` +
            `❌ Провайдер 1: <b>${escapeHtml(provider1)}</b> (отмена)\n` +
            `✅ Провайдер 2: <b>${escapeHtml(provider2)}</b> (успех)\n` +
            `${lossMsg}\n\n` +
            `<i>Клиент не получил уведомление об отмене, работа продолжается.</i>`
    },

    FINANCE: {
        DEPOSIT_SUCCESS_USER: (amount: string, balance: string) =>
            `💰 <b>Баланс пополнен!</b>\n\n` +
            `Зачислено: <b>${amount}₽</b>.\n` +
            `Баланс: <b>${balance}₽</b>`,

        PAYMENT_CRITICAL_ERROR_ADMIN: (paymentId: string, error: string) =>
            `🚨 <b>КРИТИЧЕСКАЯ ОШИБКА ОПЛАТЫ</b>\n\n` +
            `Платеж <code>${escapeHtml(paymentId)}</code> подтвержден, но <b>ЗАКАЗ НЕ БЫЛ СОЗДАН</b>.\n` +
            `Ошибка: <code>${escapeHtml(error)}</code>\n\n` +
            `<i>Проверьте транзакцию в БД и создайте заказ вручную!</i>`,

        REFUND_INTERNAL_USER: (orderId: number, amount: string, bonusMsg: string) =>
            `💰 <b>ВОЗВРАТ СРЕДСТВ</b>\n\n` +
            `Мы вернули <b>${amount}₽</b> на ваш баланс за заказ <code>#${orderId}</code>.${bonusMsg}\n\n` +
            `Приносим извинения за неудобства! Вы можете использовать эти средства для других услуг.`,

        REFUND_EXTERNAL_USER: (orderId: number, amount: string) =>
            `💳 <b>ВОЗВРАТ НА КАРТУ</b>\n\n` +
            `Заявка на возврат средств за заказ <code>#${orderId}</code> одобрена.\n\n` +
            `Сумма <b>${amount}₽</b> будет зачислена на вашу карту в течение 1-3 рабочих дней (зависит от вашего банка).`,

        PROVIDER_BALANCE_CRITICAL_ADMIN: (providerList: string) =>
            `🚨 <b>КРИТИЧЕСКИЙ БАЛАНС ПРОВАЙДЕРОВ!</b>\n\n` +
            `Средств хватит менее чем на 48 часов:\n${providerList}\n\n` +
            `<i>Пожалуйста, пополните счета, чтобы избежать остановки заказов.</i>`,

        REFERRAL_BONUS_USER: (tierBadge: string, tierLabel: string, amount: string, bonusPercentLabel: string) =>
            `${tierBadge} <b>Бонус ${tierLabel}!</b>\n` +
            `Реферал пополнил баланс. Вам +<b>${amount}₽</b>${bonusPercentLabel}.`
    },

    COMMON: {
        CANCEL: '❌ Действие отменено.',
        ERROR: '❌ Произошла ошибка. Пожалуйста, попробуйте позже.',
        AUTH_REQUIRED: '🔐 Для использования этой функции необходимо авторизоваться.',
        SUPPORT_BUTTON: '✍️ Написать в поддержку',
        SUPPORT_ORDER_BUTTON: (orderId: number) => `🆘 Поддержка по заказу #${orderId}`
    }
};


