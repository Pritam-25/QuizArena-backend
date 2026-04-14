import type { ErrorRequestHandler } from 'express';
import logger from '@infrastructure/logger/logger.js';
import { AuthTokenError } from '@shared/utils/auth/index.js';
import {
  ApiError,
  ERROR_CODES,
  normalizeError,
} from '@shared/utils/errors/index.js';
import { errorResponse, statusCode } from '@shared/utils/http/index.js';

const errorHandlerMiddleware: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const normalizedError =
    err instanceof AuthTokenError
      ? normalizeError(
          new ApiError(statusCode.unauthorized, ERROR_CODES.INVALID_TOKEN)
        )
      : normalizeError(err);
  const rawPath = req.originalUrl ?? req.url ?? req.path ?? '/';
  const sanitizedPath = rawPath.split('?')[0] || '/';

  const log = req.logger ?? logger;

  log.error(
    {
      err,
      requestId: req.requestId,
      statusCode: normalizedError.statusCode,
      path: sanitizedPath,
      method: req.method,
      module: 'http',
    },
    err instanceof Error ? err.message : 'Unhandled error'
  );

  return res
    .status(normalizedError.statusCode)
    .json(errorResponse(normalizedError));
};

export default errorHandlerMiddleware;
