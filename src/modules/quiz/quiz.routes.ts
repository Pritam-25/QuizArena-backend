import { Router } from 'express';
import { createQuizModule } from './quiz.factory.js';
import { asyncHandler } from '@shared/middlewares/asyncHandler.js';
import { authMiddleware, requireAuth } from '@shared/middlewares/auth.js';
import {
  createQuizSchema,
  addQuestionSchema,
  addOptionsSchema,
} from './quiz.schema.js';
import { validateSchema } from '@shared/middlewares/validateSchema.js';
import { z } from 'zod';

/**
 * Quiz module routes.
 * Mounted under /api/v1/quizzes.
 */
const router: Router = Router();

const { controller: quizController } = createQuizModule();

router.use(authMiddleware);

router.post(
  '/',
  requireAuth,
  validateSchema(createQuizSchema),
  asyncHandler(quizController.createQuiz.bind(quizController))
);

router.get(
  '/',
  asyncHandler(quizController.getAllQuizzes.bind(quizController))
);

router.get(
  '/:id',
  asyncHandler(quizController.getQuizById.bind(quizController))
);

router.post(
  '/:quizId/questions',
  requireAuth,
  validateSchema(addQuestionSchema),
  asyncHandler(quizController.addQuestionToQuiz.bind(quizController))
);

router.post(
  '/questions/:questionId/options',
  requireAuth,
  validateSchema(z.array(addOptionsSchema)),
  asyncHandler(quizController.addOptionToQuestion.bind(quizController))
);

export default router;
