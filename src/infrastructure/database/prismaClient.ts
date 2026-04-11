import { PrismaClient } from '@generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '@config/env.js';

// Extend globalThis to avoid multiple instances in dev (hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  max: 10,
  min: 1,
  idleTimeoutMillis: 120_000,
  connectionTimeoutMillis: 15_000,
  keepAlive: true,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Prevent multiple instances in development
if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
