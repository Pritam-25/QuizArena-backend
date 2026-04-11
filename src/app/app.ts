import express from 'express';
import type { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import {
  errorHandlerMiddleware,
  metricsMiddleware,
  requestIdMiddleware,
  requestLoggerMiddleware,
  traceIdHeaderMiddleware,
} from '@shared/middlewares/index.js';
import router from '@app/api/v1/routes.js';

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

// Add distributed trace id to response headers for client-side correlation
app.use(traceIdHeaderMiddleware);

// Metrics middleware should run after requestId so metrics can include requestId
app.use(metricsMiddleware);

/**
 * Request Logger
 */
app.use(requestLoggerMiddleware);

app.use('/api/v1', router);

app.use(errorHandlerMiddleware);

export default app;
