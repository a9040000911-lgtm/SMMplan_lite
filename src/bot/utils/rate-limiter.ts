/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { redis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';

export class RateLimiterService {
    /**
     * Checks if the user is an admin or SEO role (bypasses limits)
     */
    private static async _isAdmin(userId: string | number): Promise<boolean> {
        try {
            const user = await prisma.user.findUnique({
                where: { tgId: BigInt(userId) },
                select: { role: true }
            });
            return user?.role === 'ADMIN' || user?.role === 'SEO';
        } catch {
            return false;
        }
    }

    /**
     * Anti-Spam: Blocks sending 2FA emails maliciously.
     * Soft limit: 5 emails per 10 minutes per Telegram ID.
     */
    static async checkEmailLimit(userId: string | number, projectId: string): Promise<{ allowed: boolean, remainingDelaySec: number, attempts: number }> {
        if (await this._isAdmin(userId)) return { allowed: true, remainingDelaySec: 0, attempts: 0 };

        const key = `rl:email:${projectId}:${userId}`;
        const attempts = await redis.incr(key);

        if (attempts === 1) {
            await redis.expire(key, 600); // 10 minutes
        }

        if (attempts > 5) {
            const ttl = await redis.ttl(key);
            return { allowed: false, remainingDelaySec: ttl, attempts };
        }
        return { allowed: true, remainingDelaySec: 0, attempts };
    }

    /**
     * Anti-Spam: Protects YooKassa/Robokassa merchant APIs from order flooding.
     * Soft limit: 30 payment generations per 1 hour.
     */
    static async checkPaymentLinkLimit(userId: string | number, projectId: string): Promise<{ allowed: boolean, attempts: number }> {
        if (await this._isAdmin(userId)) return { allowed: true, attempts: 0 };

        const key = `rl:pay:${projectId}:${userId}`;
        const attempts = await redis.incr(key);

        if (attempts === 1) {
            await redis.expire(key, 3600); // 1 hour
        }

        if (attempts > 30) {
            return { allowed: false, attempts };
        }
        return { allowed: true, attempts };
    }

    /**
     * Anti-Spam: Protects Prisma connection pool and Bot polling from massive spam.
     * Hard limit: 30 requests per minute per Telegram ID.
     */
    static async checkGlobalLimit(userId: string | number, projectId: string): Promise<boolean> {
        // We do not bypass admin here to prevent accidental bot loops from admins exhausting the pool
        const key = `rl:global:${projectId}:${userId}`;
        const attempts = await redis.incr(key);

        if (attempts === 1) {
            await redis.expire(key, 60); // 1 minute window
        }

        return attempts <= 30; // Max 30 messages/actions per minute allowed
    }
}
