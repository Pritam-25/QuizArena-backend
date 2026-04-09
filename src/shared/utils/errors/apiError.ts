import type { ErrorCode } from "./errorCodes.js";
import { ERROR_MESSAGES } from "./errorMessages.js";

export class ApiError extends Error {
  statusCode: number;
  errorCode: ErrorCode;
  details?: unknown;

  constructor(statusCode: number, errorCode: ErrorCode, details?: unknown) {
    super(ERROR_MESSAGES[errorCode]);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}
