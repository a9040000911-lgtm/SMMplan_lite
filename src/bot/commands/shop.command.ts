/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { Markup } from 'telegraf';
import { getProjectMenu } from '../utils/menu.utils';

export async function handleShop(ctx: any) {
    let webAppUrl = ctx.project?.domain ? `https://${ctx.project.domain}` : (process.env.NEXT_PUBLIC_APP_URL || process.env.WEBAPP_URL || "https://smmplan.ru");
    if (webAppUrl.startsWith('http://') && !webAppUrl.includes('localhost') && !webAppUrl.includes('.local')) webAppUrl = webAppUrl.replace('http://', 'https://');
    await ctx.reply('🛍 Открыть магазин:', { ...getProjectMenu(ctx.project), ...Markup.inlineKeyboard([[Markup.button.webApp('🚀 Вперед!', webAppUrl)]]) });
}


