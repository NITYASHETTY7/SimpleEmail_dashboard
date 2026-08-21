import Redis, { RedisOptions } from 'ioredis';
import { env } from './env';

export function createRedisClient(): Redis {
  if (env.REDIS_URL && env.REDIS_URL.trim() !== '') {
    const isTls = env.REDIS_URL.startsWith('rediss://') || env.REDIS_URL.includes('upstash.io');
    return new Redis(env.REDIS_URL.trim(), {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: isTls ? { rejectUnauthorized: false } : undefined,
      retryStrategy(times: number) {
        if (times > 10) return null;
        return Math.min(times * 200, 2000);
      },
    });
  }

  const options: RedisOptions = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times: number) {
      if (times > 10) return null;
      return Math.min(times * 200, 2000);
    },
  };

  return new Redis(options);
}

export const redisClient = createRedisClient();

redisClient.on('connect', () => {
  console.log(`✅ [Redis] Connected successfully to Cloud Redis (Upstash)`);
});

redisClient.on('error', (err) => {
  console.warn(`⚠️ [Redis Connection Notice]: ${err.message}`);
});
