import { describe, expect, it } from 'vitest';
import { Prisma } from '../../../../src/generated/prisma/client.js';
import { ApiError } from '../../../../src/shared/utils/errors/apiError.js';
import { ERROR_CODES } from '../../../../src/shared/utils/errors/errorCodes.js';
import { ERROR_MESSAGES } from '../../../../src/shared/utils/errors/errorMessages.js';
import { normalizeError } from '../../../../src/shared/utils/errors/normalizeError.js';
import { statusCode } from '../../../../src/shared/utils/http/statusCodes.js';

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

describe('normalizeError', () => {
  it('returns ApiError contract for ApiError inputs', () => {
    const error = new ApiError(
      statusCode.conflict,
      ERROR_CODES.USER_ALREADY_EXISTS,
      { email: 'taken@example.com' }
    );

    expect(normalizeError(error)).toEqual({
      statusCode: statusCode.conflict,
      errorCode: ERROR_CODES.USER_ALREADY_EXISTS,
      message: ERROR_MESSAGES.USER_ALREADY_EXISTS,
      details: { email: 'taken@example.com' },
    });
  });

  it('maps db nickname conflict into domain contract', () => {
    const error = createKnownRequestError('P2002', ['nickname']);

    expect(normalizeError(error)).toEqual({
      statusCode: statusCode.conflict,
      errorCode: ERROR_CODES.PARTICIPANT_NICKNAME_TAKEN,
      message: ERROR_MESSAGES.PARTICIPANT_NICKNAME_TAKEN,
    });
  });

  it('maps db not found into NOT_FOUND contract', () => {
    const error = createKnownRequestError('P2025');

    expect(normalizeError(error)).toEqual({
      statusCode: statusCode.notFound,
      errorCode: ERROR_CODES.NOT_FOUND,
      message: ERROR_MESSAGES.NOT_FOUND,
    });
  });

  it('maps native Error to INTERNAL_ERROR preserving message', () => {
    expect(normalizeError(new Error('unexpected failure'))).toEqual({
      statusCode: statusCode.internalError,
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      message: 'unexpected failure',
    });
  });

  it('maps unknown object to INTERNAL_ERROR with details', () => {
    const payload = { reason: 'timeout' };

    expect(normalizeError(payload)).toEqual({
      statusCode: statusCode.internalError,
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      message: ERROR_MESSAGES.INTERNAL_ERROR,
      details: payload,
    });
  });

  it('maps primitive unknown to INTERNAL_ERROR fallback', () => {
    expect(normalizeError('boom')).toEqual({
      statusCode: statusCode.internalError,
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      message: ERROR_MESSAGES.INTERNAL_ERROR,
    });
  });
});
