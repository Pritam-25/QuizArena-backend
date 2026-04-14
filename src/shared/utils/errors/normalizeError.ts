import { statusCode } from '../http/statusCodes.js';
import { ApiError } from './apiError.js';
import { ERROR_CODES } from './errorCodes.js';
import type { ErrorContract } from './errorContract.js';
import { ERROR_MESSAGES } from './errorMessages.js';
import { normalizeDbError } from './normalizeDbError.js';

const mapStatusCode = (errorCode: string): number => {
  switch (errorCode) {
    case ERROR_CODES.USER_ALREADY_EXISTS:
    case ERROR_CODES.PARTICIPANT_NICKNAME_TAKEN:
    case ERROR_CODES.DUPLICATE_OPTIONS:
    case ERROR_CODES.DUPLICATE_QUESTION_ORDER:
    case ERROR_CODES.CONFLICT:
      return statusCode.conflict;

    case ERROR_CODES.NOT_FOUND:
      return statusCode.notFound;

    case ERROR_CODES.INVALID_INPUT:
      return statusCode.badRequest;

    default:
      return statusCode.internalError;
  }
};

export const normalizeError = (error: unknown): ErrorContract => {
  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      errorCode: error.errorCode,
      message: ERROR_MESSAGES[error.errorCode] ?? error.message,
      details: error.details,
    };
  }

  const dbErrorCode = normalizeDbError(error);
  if (dbErrorCode) {
    return {
      statusCode: mapStatusCode(dbErrorCode),
      errorCode: dbErrorCode,
      message: ERROR_MESSAGES[dbErrorCode] ?? ERROR_MESSAGES.INTERNAL_ERROR,
    };
  }

  if (error instanceof Error) {
    return {
      statusCode: statusCode.internalError,
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      message: ERROR_MESSAGES.INTERNAL_ERROR,
    };
  }

  if (typeof error === 'object' && error !== null) {
    return {
      statusCode: statusCode.internalError,
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      message: ERROR_MESSAGES.INTERNAL_ERROR,
      details: error,
    };
  }

  return {
    statusCode: statusCode.internalError,
    errorCode: ERROR_CODES.INTERNAL_ERROR,
    message: ERROR_MESSAGES.INTERNAL_ERROR,
  };
};
