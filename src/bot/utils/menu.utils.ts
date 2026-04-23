/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { Markup } from 'telegraf';

export const categoryNames: Record<string, string> = {
    SUBSCRIBERS: '👤 Подписчики',
    LIKES: '❤️ Лайки',
    VIEWS: '👁 Просмотры',
    REACTIONS: '👍 Реакции',
    REPOSTS: '📢 Репосты',
    BOOSTS: '🚀 Бусты канала',
    POLLS: '📊 Опросы/Голосования',
    STORIES: '📱 Истории',
    BOTS: '🤖 Запуск ботов',
    COMMENTS: '💬 Комментарии',
    REFERRALS: '🐝 Рефералы в ботов',
    FRIENDS: '👥 Друзья',
    PLAYS: '🎵 Прослушивания',
    RECOVER: '♻️ Восстановление',
    PREMIUM: '💎 Премиум',
    STARS: '⭐️ Звезды',
    OTHER: '🧩 Другое'
};

export const MENU_ACTIONS: Record<string, { label: string }> = {
    ORDER: { label: '🚀 Заказать' },
    AUTO: { label: '🤖 Авто-пилот' },
    BALANCE: { label: '💼 Баланс' },
    ORDERS: { label: '📦 Мои заказы' },
    NEWS: { label: '🆕 Новости' },
    REFERRALS: { label: '👥 Рефералы' },
    CATALOG: { label: '📑 Каталог' },
    INFO: { label: 'ℹ️ Инфо' },
    SUPPORT: { label: '🆘 Поддержка' },
    URL_BUTTON: { label: '🔗 Ссылка (URL)' },
    DEPOSIT: { label: '💳 Пополнить баланс' },
    PROMO: { label: '🎁 Промокод' },
    CATEGORY: { label: '📂 Категория услуг' },
    FAQ: { label: '❓ Вопросы и ответы' },
    CONTACTS: { label: '👥 Контакты' },
    WEBAPP: { label: '📱 Открыть Web-App' },
    MASS: { label: '📊 Массовый заказ' }
};

export const staticMainMenu = [
    ['ORDER', 'AUTO'],
    ['BALANCE', 'ORDERS'],
    ['NEWS', 'REFERRALS'],
    ['CATALOG', 'INFO'],
    ['SUPPORT']
];

export const getProjectMenu = (project: any) => {
    const layout = project?.config?.menuLayout || staticMainMenu;
    const translatedLayout = layout.map((row: any) =>
        row.map((item: any) => {
            const id = typeof item === 'string' ? item : item.id;
            const label = typeof item === 'object' && item.label ? item.label : (MENU_ACTIONS[id]?.label || id);
            return label;
        })
    );
    return Markup.keyboard(translatedLayout).resize();
};

export function findMenuItem(layout: any[][], actionId: string, label: string) {
    for (const row of layout) {
        const item = row.find((item: any) => {
            const id = typeof item === 'string' ? item : item.id;
            const itemLabel = typeof item === 'object' && item.label ? item.label : (MENU_ACTIONS[id]?.label || id);
            return id === actionId && (label === itemLabel);
        });
        if (item) return item;
    }
    return null;
}


