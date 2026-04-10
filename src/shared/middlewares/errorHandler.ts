import type { ErrorRequestHandler } from 'express';
import logger from '@infrastructure/logger/logger.js';
import { ApiError, ERROR_CODES } from '@shared/utils/errors/index.js';
import { errorResponse, statusCode } from '@shared/utils/http/index.js';

const getStatusCode = (err: unknown): number => {
  if (err instanceof ApiError) {
    return err.statusCode;
  }

  if (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    typeof err.statusCode === 'number' &&
    err.statusCode >= 400 &&
    err.statusCode <= 599
  ) {
    return err.statusCode;
  }

  return statusCode.internalError;
};

const errorHandlerMiddleware: ErrorRequestHandler = (err, req, res, _next) => {
  const status = getStatusCode(err);
  const rawPath = req.originalUrl ?? req.url ?? req.path ?? '/';
  const sanitizedPath = rawPath.split('?')[0] || '/';

  const log = req.logger ?? logger;

  log.error(
    {
      err,
      requestId: req.requestId,
      statusCode: status,
      path: sanitizedPath,
      method: req.method,
      module: 'http',
    },
    err instanceof Error ? err.message : 'Unhandled error'
  );

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(errorResponse(err));
  }

  const internalError = new ApiError(
    statusCode.internalError,
    ERROR_CODES.INTERNAL_ERROR
  );

  return res.status(status).json(errorResponse(internalError));
};

export default errorHandlerMiddleware;
