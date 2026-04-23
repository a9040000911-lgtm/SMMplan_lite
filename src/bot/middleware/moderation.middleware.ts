/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { RateLimiterService } from '@/bot/utils/rate-limiter';


export const moderationMiddleware = async (ctx: any, next: any) => {
    const userId = ctx.from?.id;
    const projectId = ctx.project?.id;

    console.error(`!!! [Moderation] Middleware Triggered for user:${userId} project:${projectId}`);

    if (ctx.message?.text === 'ping') {
        await ctx.reply('pong').catch((e: any) => console.error('Ping failed:', e.message));
    }

    if (!userId || !projectId) return next();

    // 1. HARD GLOBAL RATE-LIMIT (PRISMA POOL PROTECTION)
    const isAllowed = await RateLimiterService.checkGlobalLimit(userId, projectId);
    if (!isAllowed) {
        // Drop silently or give a minimal local warning to prevent outbound spam
        console.warn(`[RateLimit] Dropping request from ${userId} (exceeded 30 req/min)`);
        return; // Break pipeline
    }

    try {
        const cacheKey = `bot_mod:${projectId}:${userId}`;
        const cachedData = await redis.get(cacheKey);

        let user: any = null;

        if (cachedData) {
            user = JSON.parse(cachedData);
        } else {
            console.error(`[Moderation] TRACE SQL user:${userId} proj:${projectId}`);

            user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { projectId, tgId: BigInt(userId) },
                        { projectId: null, tgId: BigInt(userId) }
                    ]
                },
                select: { isPermanentlyBanned: true, banExpiresAt: true, role: true }
            });

            // TTL 60 seconds. We only cache it briefly to absorb chat spam
            await redis.set(cacheKey, JSON.stringify(user || {not_found: true}), 'EX', 60);
        }

        if (user && !user.not_found) {
            const banDate = user.banExpiresAt ? new Date(user.banExpiresAt) : null;
            const isTempBanned = banDate && banDate > new Date();
            if (user.isPermanentlyBanned || isTempBanned) {
                console.error(`[Moderation] BAN DETECTED for ${userId}`);

                await ctx.reply('ВАШ АККАУНТ ЗАБЛОКИРОВАН АДМИНИСТРАТОРОМ')
                    .catch((e: any) => console.error(`[Moderation] REPLY ERROR: ${e.message}`));

                return;
            }
        }
    } catch (err: any) { console.error('[Moderation] CRITICAL ERROR:', err.message); }

    return next();
};


