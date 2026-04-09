import type { ApiError } from "../errors/apiError.js";
import { getRequestId } from "../context/getRequestId.js";

export const successResponse = <T>(message: string, data?: T) => ({
  success: true as const,
  message,
  data,
  meta: {
    timestamp: new Date().toISOString(),
    requestId: getRequestId(),
  },
});

export const errorResponse = <T>(error: ApiError) => ({
  success: false as const,
  error: {
    statusCode: error.statusCode,
    errorCode: error.errorCode,
    message: error.message,
    ...(error.details ? { details: error.details } : {}),
  },
  meta: {
    timestamp: new Date().toISOString(),
    requestId: getRequestId(),
  },
});
