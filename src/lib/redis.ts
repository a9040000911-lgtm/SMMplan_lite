import { Redis } from 'ioredis';

const globalForRedis = global as unknown as { redis: Redis };

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis =
  globalForRedis.redis ||
  new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    retryStrategy: (times) => {
      // Return null to explicitly stop retrying if Redis is totally unavailable.
      // We don't want to crash or freeze the app if Redis is down, we want to fallback gracefully.
      if (times > 3) return null;
      return Math.min(times * 50, 2000);
    },
  });

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

// Fire and forget error handler to prevent unhandled rejection crashes
redis.on('error', (err) => {
  console.error('[REDIS] Connection error:', err.message);
});
