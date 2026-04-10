import type { Request, Response, NextFunction } from 'express';
import { getTraceId } from '@shared/utils/context/index.js';

const traceIdHeaderMiddleware = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  const traceId = getTraceId();
  if (traceId) {
    res.setHeader('X-Trace-Id', traceId);
  }

  next();
};

export default traceIdHeaderMiddleware;
