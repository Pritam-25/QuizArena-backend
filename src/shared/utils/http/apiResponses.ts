import { normalizeError } from '@shared/utils/errors/index.js';
import { createMeta } from './baseResponse.js';

export const successResponse = <T>(
  message: string,
  data?: T,
  metaExtra?: Record<string, unknown>
) => ({
  success: true as const,
  message,
  data,
  meta: createMeta(metaExtra),
});

export const errorResponse = (
  error: unknown,
  metaExtra?: Record<string, unknown>
) => {
  const ErrorContract = normalizeError(error);

  return {
    success: false as const,
    error: {
      statusCode: ErrorContract.statusCode,
      errorCode: ErrorContract.errorCode,
      message: ErrorContract.message,
      ...(ErrorContract.statusCode < 500 && ErrorContract.details
        ? { details: ErrorContract.details }
        : {}),
    },
    meta: createMeta(metaExtra),
  };
};

export const buildErrorResponse = errorResponse;
