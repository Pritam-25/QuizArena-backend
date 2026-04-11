import { Router } from 'express';
import type { Request, Response } from 'express';
import client from 'prom-client';
import { statusCode, successResponse } from '@shared/utils/http/index.js';
import userRoutes from '@modules/user/user.routes.js';
import quizRoutes from '@modules/quiz/quiz.routes.js';

const router: Router = Router();

/**
 * Health Check
 */
router.get('/health', (_req: Request, res: Response) => {
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
router.get('/metrics', async (_req: Request, res: Response) => {
  res.setHeader('Content-Type', client.register.contentType);
  const metrics = await client.register.metrics();
  res.send(metrics);
});

/**
 * Root Route
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(statusCode.success).json(
    successResponse('Welcome to the Live Quiz Arena API', {
      version: '1.0.0',
      endpoints: {
        health: '/api/v1/health',
      },
    })
  );
});

router.use('/users', userRoutes);
router.use('/quizzes', quizRoutes);

export default router;
