import { afterAll, afterEach, vi } from 'vitest';
import { prisma } from '../../src/infrastructure/database/prismaClient.js';

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});
