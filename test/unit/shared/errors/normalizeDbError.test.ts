import { describe, expect, it } from 'vitest';
import { Prisma } from '../../../../src/generated/prisma/client.js';
import { ERROR_CODES } from '../../../../src/shared/utils/errors/errorCodes.js';
import { normalizeDbError } from '../../../../src/shared/utils/errors/normalizeDbError.js';

const createKnownRequestError = (
  code: string,
  target?: string[] | string
): Prisma.PrismaClientKnownRequestError => {
  const error = Object.create(
    Prisma.PrismaClientKnownRequestError.prototype
  ) as Prisma.PrismaClientKnownRequestError;

  Object.assign(error, {
    code,
    meta: target ? { target } : undefined,
  });

  return error;
};

describe('normalizeDbError', () => {
  it('returns null for non-prisma errors', () => {
    expect(normalizeDbError(new Error('boom'))).toBeNull();
  });

  it('maps P2002 with email target to USER_ALREADY_EXISTS', () => {
    const error = createKnownRequestError('P2002', ['email']);
    expect(normalizeDbError(error)).toBe(ERROR_CODES.USER_ALREADY_EXISTS);
  });

  it('maps P2002 with nickname target to PARTICIPANT_NICKNAME_TAKEN', () => {
    const error = createKnownRequestError('P2002', ['nickname']);
    expect(normalizeDbError(error)).toBe(
      ERROR_CODES.PARTICIPANT_NICKNAME_TAKEN
    );
  });

  it('maps P2002 with order target to DUPLICATE_QUESTION_ORDER', () => {
    const error = createKnownRequestError('P2002', ['order']);
    expect(normalizeDbError(error)).toBe(ERROR_CODES.DUPLICATE_QUESTION_ORDER);
  });

  it('maps P2002 with option text target to DUPLICATE_OPTIONS', () => {
    const error = createKnownRequestError('P2002', ['text']);
    expect(normalizeDbError(error)).toBe(ERROR_CODES.DUPLICATE_OPTIONS);
  });

  it('maps P2002 with unknown target to CONFLICT', () => {
    const error = createKnownRequestError('P2002', ['slug']);
    expect(normalizeDbError(error)).toBe(ERROR_CODES.CONFLICT);
  });

  it('maps P2025 to NOT_FOUND', () => {
    const error = createKnownRequestError('P2025');
    expect(normalizeDbError(error)).toBe(ERROR_CODES.NOT_FOUND);
  });

  it('maps P2003 to INVALID_INPUT', () => {
    const error = createKnownRequestError('P2003');
    expect(normalizeDbError(error)).toBe(ERROR_CODES.INVALID_INPUT);
  });

  it('maps unknown prisma code to INTERNAL_ERROR', () => {
    const error = createKnownRequestError('P9999');
    expect(normalizeDbError(error)).toBe(ERROR_CODES.INTERNAL_ERROR);
  });
});
