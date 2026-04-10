import express from 'express';
import type { Request, Response, Application, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import {
  metricsMiddleware,
  requestIdMiddleware,
  requestLoggerMiddleware,
} from '@shared/middlewares/index.js';
import { statusCode, successResponse } from '@shared/utils/http/index.js';
import client from 'prom-client';

const app: Application = express();

/**
 * Middlewares
 */
app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request ID middleware should run first so downstream code gets requestId
app.use(requestIdMiddleware);

// Metrics middleware should run after requestId so metrics can include requestId
app.use(metricsMiddleware);

/**
 * Request Logger
 */
app.use(requestLoggerMiddleware);

/**
 * Health Check
 */
app.get('/health', (_req: Request, res: Response) => {
  res.status(statusCode.success).json(
    successResponse('Service is healthy', {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  );
});

/**
 * Metrics Route
 */
app.get('/metrics', async (_req: Request, res: Response) => {
  res.setHeader('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});

/**
 * Root Route
 */
app.get('/', (_req: Request, res: Response) => {
  res.status(statusCode.success).json(
    successResponse('Welcome to the Live Quiz Arena API', {
      version: '1.0.0',
      endpoints: {
        health: '/health',
      },
    })
  );
});

export default app;
