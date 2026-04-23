/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { redis } from '@/lib/redis';

/**
 * Custom Telegraf Session Store backed by our global Redis instance.
 * Ensures that bot sessions (Wizard states, shopping carts) survive PM2/Docker restarts.
 */
export const RedisSessionStore = {
  get: async (key: string): Promise<any | undefined> => {
    try {
      const data = await redis.get(`tg_session:${key}`);
      return data ? JSON.parse(data) : undefined;
    } catch (err) {
      console.error('[RedisSession] Get Error:', err);
      return undefined;
    }
  },
  set: async (key: string, value: any): Promise<void> => {
    try {
      if (!value || Object.keys(value).length === 0) {
        await redis.del(`tg_session:${key}`);
      } else {
        // Session TTL: 24 hours (86400 seconds) to auto-cleanup abandoned carts
        await redis.set(`tg_session:${key}`, JSON.stringify(value), 'EX', 86400);
      }
    } catch (err) {
      console.error('[RedisSession] Set Error:', err);
    }
  },
  delete: async (key: string): Promise<void> => {
    try {
      await redis.del(`tg_session:${key}`);
    } catch (err) {
      console.error('[RedisSession] Delete Error:', err);
    }
  }
};
