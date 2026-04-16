import { Prisma } from '@generated/prisma/client.js';
import { ERROR_CODES } from './errorCodes.js';
import type { ErrorCode } from './errorCodes.js';

const toTargetFields = (target: unknown): string[] => {
  if (Array.isArray(target)) {
    return target.filter((value): value is string => typeof value === 'string');
  }

  if (typeof target === 'string') {
    return [target];
  }

  return [];
};

/**
 * Extracts constraint field names from Prisma error meta.
 * Handles both standard Prisma (`meta.target`) and driver adapter
 * (`meta.driverAdapterError.cause.constraint.fields`) paths.
 */
const extractConstraintFields = (
  meta: Record<string, unknown> | undefined
): string[] => {
  if (!meta) return [];

  // Standard Prisma path
  const fromTarget = toTargetFields(meta.target);
  if (fromTarget.length > 0) return fromTarget;

  // Driver adapter path (@prisma/adapter-pg)
  const driverError = meta.driverAdapterError;
  if (typeof driverError === 'object' && driverError !== null) {
    const cause = (driverError as Record<string, unknown>).cause;
    if (typeof cause === 'object' && cause !== null) {
      const constraint = (cause as Record<string, unknown>).constraint;
      if (typeof constraint === 'object' && constraint !== null) {
        const fields = (constraint as Record<string, unknown>).fields;
        return toTargetFields(fields).map(f => f.replace(/^"|"$/g, ''));
      }
    }
  }

  return [];
};

export const normalizeDbError = (error: unknown): ErrorCode | null => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  switch (error.code) {
    case 'P2002': {
      const targetFields = extractConstraintFields(error.meta);

      if (targetFields.includes('email')) {
        return ERROR_CODES.USER_ALREADY_EXISTS;
      }

      if (targetFields.includes('nickname')) {
        return ERROR_CODES.PARTICIPANT_NICKNAME_TAKEN;
      }

      if (targetFields.includes('order')) {
        return ERROR_CODES.DUPLICATE_QUESTION_ORDER;
      }

      if (targetFields.includes('text') || targetFields.includes('label')) {
        return ERROR_CODES.DUPLICATE_OPTIONS;
      }

      return ERROR_CODES.CONFLICT;
    }

    case 'P2025':
      return ERROR_CODES.NOT_FOUND;

    case 'P2003':
      return ERROR_CODES.INVALID_INPUT;

    default:
      return ERROR_CODES.INTERNAL_ERROR;
  }
};
