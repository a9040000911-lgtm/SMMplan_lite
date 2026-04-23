/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { Markup } from 'telegraf';
import { getProjectMenu } from '../utils/menu.utils';

import { ConfigService } from '@/services/core/config.service';

export async function handleAdmin(ctx: any) {
    const config = await ConfigService.getTelegramConfig(ctx.project?.id);
    if (ctx.from!.id !== Number(config.adminId)) return ctx.reply('❌ Нет прав.', getProjectMenu(ctx.project));
    await ctx.reply(`📊 <b>АДМИН-ПАНЕЛЬ: ${ctx.project.name}</b>`, { parse_mode: 'HTML', ...getProjectMenu(ctx.project), ...Markup.inlineKeyboard([[Markup.button.callback('📦 Заказы', 'admin_latest_orders')]]) });
}


