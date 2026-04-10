import type { NextFunction, Request, Response } from 'express';
import {
  activeRequestsGauge,
  httpRequestCounter,
  httpRequestDuration,
} from '@infrastructure/metrics/metrics.js';

const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();

  activeRequestsGauge.inc();

  let handled = false;

  const recordRequestMetrics = () => {
    if (handled) return;
    handled = true;

    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const routePath = req.route?.path;
    const route =
      typeof routePath === 'string'
        ? `${req.baseUrl || ''}${routePath}`
        : 'unmatched';
    const status = String(res.statusCode);

    httpRequestCounter.inc({
      method: req.method,
      route,
      status,
    });

    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status,
      },
      durationMs
    );

    activeRequestsGauge.dec();
  };

  res.on('finish', recordRequestMetrics);
  res.on('close', recordRequestMetrics);

  next();
};

export default metricsMiddleware;
