import { Prisma } from '@generated/prisma/client.js';

export const DB_ERROR_CODES = {
  UNIQUE_CONSTRAINT: 'P2002',
} as const;

export function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === DB_ERROR_CODES.UNIQUE_CONSTRAINT
  );
}
