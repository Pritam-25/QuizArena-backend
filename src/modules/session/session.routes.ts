import { Router } from 'express';
import { asyncHandler } from '@shared/middlewares/asyncHandler.js';
import { validateSchema } from '@shared/middlewares/validateSchema.js';
import { createSessionModule } from './session.factory.js';
import { createSessionSchema, joinSessionSchema } from './session.schema.js';

/**
 * Session module routes.
 * Mounted under /api/v1/sessions.
 */
const router: Router = Router();

const { controller: sessionController } = createSessionModule();

router.post(
  '/',
  validateSchema(createSessionSchema),
  asyncHandler(sessionController.createSession.bind(sessionController))
);

router.get(
  '/:sessionId',
  asyncHandler(sessionController.getSessionById.bind(sessionController))
);

router.post(
  '/join',
  validateSchema(joinSessionSchema),
  asyncHandler(sessionController.joinSession.bind(sessionController))
);

router.post(
  '/:sessionId/start',
  asyncHandler(sessionController.startSession.bind(sessionController))
);

export default router;
