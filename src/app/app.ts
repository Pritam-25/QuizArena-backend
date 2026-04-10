import express from 'express';
import type { Request, Response, Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

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

/**
 * Health Check
 */
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Root Route
 */
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    message: 'Welcome to the Live Quiz App Backend!',
  });
});

export default app;
