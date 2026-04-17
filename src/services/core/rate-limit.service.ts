import { db } from "@/lib/db";
import { headers } from "next/headers";

export class RateLimitService {
  /**
   * Enforces a rate limit for a given action using the request IP.
   * Uses Postgres Database persistence to track hits across serverless instances.
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
      
      // Cleanup expired records (Fire and forget, keeps DB clean)
      db.rateLimit.deleteMany({
        where: { expiresAt: { lte: now } }
      }).catch(e => console.error("RateLimit cleanup error:", e));

      // Attempt to upsert the rate limit record for this IP + Endpoint
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

      // If they exceeded threshold, block
      if (record.hits > maxHits) {
         console.warn(`[RATE_LIMIT] Blocked ${ip} on ${endpoint} (${record.hits}/${maxHits})`);
         return false;
      }

      return true;
    } catch (e) {
      console.error("[RATE_LIMIT] Fatal Failure, failing open:", e);
      // In production, failing open might be required if DB is under stress to not break checkout
      // But failing closed is safer for DDoS. We choose open for lite.
      return true;
    }
  }
}
