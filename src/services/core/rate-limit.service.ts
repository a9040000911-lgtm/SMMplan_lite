import { db } from "@/lib/db";
import { headers } from "next/headers";
import { redis } from "@/lib/redis";

export class RateLimitService {
  /**
   * Enforces a rate limit for a given action using the request IP.
   * Uses Redis for high-performance distributed rate limiting,
   * falling back to PostgreSQL if Redis is unavailable.
   * 
   * @param endpoint ID of the protected resource
   * @param maxHits Maximum attempts allowed
   * @param windowSeconds Window length in seconds
   * @returns boolean true if allowed, false if blocked
   */
  static async check(
    endpoint: string, 
    maxHits: number = 10, 
    windowSeconds: number = 60
  ): Promise<boolean> {
    try {
      const headerList = await headers();
      const forwardedFor = headerList.get("x-forwarded-for");
      const ip = forwardedFor ? forwardedFor.split(",")[0] : "127.0.0.1";
      
      const now = new Date();
      const redisKey = `ratelimit:${endpoint}:${ip}`;

      // 1. Try Redis First
      try {
        if (redis.status === 'ready' || redis.status === 'connecting') {
          const hits = await redis.incr(redisKey);
          if (hits === 1) {
            await redis.expire(redisKey, windowSeconds);
          }
          if (hits > maxHits) {
             console.warn(`[RATE_LIMIT:REDIS] Blocked ${ip} on ${endpoint} (${hits}/${maxHits})`);
             return false;
          }
          return true;
        }
      } catch (redisError) {
        console.warn("[RATE_LIMIT:REDIS] Redis check failed, falling back to PostgreSQL:", (redisError as Error).message);
      }

      // 2. Fallback to Postgres (if Redis is down or not configured)
      db.rateLimit.deleteMany({
        where: { expiresAt: { lte: now } }
      }).catch(e => console.error("RateLimit cleanup error:", e));

      const record = await db.rateLimit.upsert({
        where: {
          ip_endpoint: { ip, endpoint }
        },
        update: {
          hits: { increment: 1 }
        },
        create: {
          ip,
          endpoint,
          hits: 1,
          expiresAt: new Date(now.getTime() + windowSeconds * 1000)
        }
      });

      if (record.hits > maxHits) {
         console.warn(`[RATE_LIMIT:PG] Blocked ${ip} on ${endpoint} (${record.hits}/${maxHits})`);
         return false;
      }

      return true;
    } catch (e) {
      console.error("[RATE_LIMIT] Fatal Failure, failing open:", e);
      return true;
    }
  }
}

