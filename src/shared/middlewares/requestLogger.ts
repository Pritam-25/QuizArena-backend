import type { Request, Response, NextFunction } from 'express';
import logger from '@infrastructure/logger/logger.js';
import { getTraceId } from '@shared/utils/context/index.js';

const requestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  let logged = false;

  const logRequest = () => {
    if (logged) return;
    logged = true;
    const duration = Date.now() - start;
    const rawPath = req.originalUrl ?? req.url ?? req.path ?? '/';
    const sanitizedPath = rawPath.split('?')[0] || '/';

    const traceId = getTraceId();

    const logMeta = {
      method: req.method,
      path: sanitizedPath,
      requestId: req.requestId,
      traceId,
      statusCode: res.statusCode,
      durationMs: duration,
      module: 'http',
    };

    const message = `${req.method} ${sanitizedPath} ${res.statusCode} ${duration}ms`;

    const log = req.logger ?? logger;

    if (res.statusCode >= 500) {
      log.error(logMeta, message);
      return;
    }

    if (res.statusCode >= 400) {
      log.warn(logMeta, message);
      return;
    }

    log.info(logMeta, message);
  };

  res.on('finish', logRequest);
  res.on('close', logRequest);

  next();
};

export default requestLoggerMiddleware;
