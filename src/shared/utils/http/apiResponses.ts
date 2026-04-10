import type { ApiError } from '@shared/utils/errors/index.js';
import { getRequestId } from '@shared/utils/context/index.js';
import { getTraceId } from '@shared/utils/context/index.js';

export const successResponse = <T>(message: string, data?: T) => ({
  success: true as const,
  message,
  data,
  meta: {
    requestId: getRequestId(),
    traceId: getTraceId(),
  },
});

export const errorResponse = <T>(error: ApiError) => ({
  success: false as const,
  error: {
    statusCode: error.statusCode,
    errorCode: error.errorCode,
    message: error.message,
    ...(error.statusCode < 500 && error.details
      ? { details: error.details }
      : {}),
  },
  meta: {
    requestId: getRequestId(),
    traceId: getTraceId(),
  },
});
