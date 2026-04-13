import { Redis } from 'ioredis';
import { env } from '@config/env.js';
import logger from '@infrastructure/logger/logger.js';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

/**
 * Builds a configured ioredis client from REDIS_URL and wires lifecycle logging.
 */
const createRedisClient = () => {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  client.on('connect', () => {
    logger.info('Redis (ioredis) connected');
  });

  client.on('error', (error: unknown) => {
    logger.error({ err: error }, 'Redis (ioredis) error');
  });

  return client;
};

/**
 * Shared Redis client singleton for application infrastructure/services.
 */
export const redis = globalForRedis.redis ?? createRedisClient();

if (env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

/**
 * Gracefully closes the shared Redis connection if it is still open.
 */
export const disconnectRedis = async () => {
  if (redis.status === 'end') {
    return;
  }

  await redis.quit();
};
