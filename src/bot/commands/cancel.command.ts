/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { SessionService } from '@/services/core';
import { getProjectMenu } from '../utils/menu.utils';

export async function handleCancel(ctx: any) {
    await SessionService.delete(ctx.from.id, ctx.project.id).catch(() => { });
    await ctx.reply('✅ Действие отменено.', getProjectMenu(ctx.project));
}


