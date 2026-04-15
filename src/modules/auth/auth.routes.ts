import { Router } from 'express';
import { createAuthModule } from './auth.factory.js';
import { asyncHandler } from '@shared/middlewares/asyncHandler.js';
import { authMiddleware, requireAuth } from '@shared/middlewares/auth.js';
import { validateSchema } from '@shared/middlewares/validateSchema.js';
import { loginSchema, registerSchema } from './auth.schema.js';

const router: Router = Router();

const { controller: authController } = createAuthModule();

router.post(
  '/register',
  validateSchema(registerSchema),
  asyncHandler(authController.register.bind(authController))
);

router.post(
  '/login',
  validateSchema(loginSchema),
  asyncHandler(authController.login.bind(authController))
);

router.get(
  '/me',
  authMiddleware,
  requireAuth,
  asyncHandler(authController.me.bind(authController))
);

export default router;
