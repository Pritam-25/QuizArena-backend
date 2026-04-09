import type{ Request, Response, NextFunction } from "express";

const requestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();

  const logRequest = () => {
    const duration = Date.now() - start;
    const sanitizedPath = req.baseUrl + req.path;

    const logMeta = {
      method: req.method,
      path: sanitizedPath,
      ip: req.headers["x-forwarded-for"] || req.ip,
      userAgent: req.headers["user-agent"],
      requestId: req.requestId,
      statusCode: res.statusCode,
      durationMs: duration,
      contentLength: res.getHeader("content-length"),
    };

    const message = `${req.method} ${sanitizedPath}`;

    // Use request-scoped logger
    const log = req.logger ?? console;

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

  res.on("finish", logRequest);
  res.on("close", logRequest); 

  next();
};

export default requestLoggerMiddleware;
