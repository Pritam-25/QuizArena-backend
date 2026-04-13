import { randomUUID } from 'node:crypto';
import { describe } from 'vitest';
import { prisma } from '../../src/infrastructure/database/prismaClient.js';

export const describeDb =
  process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

export async function createRegisteredUser(overrides?: {
  username?: string;
  email?: string;
  password?: string;
}) {
  return prisma.user.create({
    data: {
      username: overrides?.username ?? `user_${randomUUID()}`,
      email: overrides?.email ?? `${randomUUID()}@example.com`,
      password: overrides?.password ?? 'password123',
      isGuest: false,
    },
  });
}

export async function createQuizForUser(
  userId: string,
  overrides?: {
    title?: string;
    description?: string | null;
  }
) {
  return prisma.quiz.create({
    data: {
      title: overrides?.title ?? `Quiz ${randomUUID()}`,
      description: overrides?.description ?? 'integration quiz',
      createdBy: userId,
    },
  });
}
