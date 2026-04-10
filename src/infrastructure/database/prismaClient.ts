import { PrismaClient } from '@generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '@config/env.js';

// Extend globalThis to avoid multiple instances in dev (hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });

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
