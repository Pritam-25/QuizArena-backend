import { Router } from 'express';
import { createUserModule } from './user.factory.js';
import { asyncHandler } from '@shared/middlewares/asyncHandler.js';
import { createUserSchema } from './user.schema.js';
import { validateSchema } from '@shared/middlewares/validateSchema.js';

const router: Router = Router();

const { controller: userController } = createUserModule();

router.post(
  '/',
  validateSchema(createUserSchema),
  asyncHandler(userController.createUser.bind(userController))
);
router.get('/:id', asyncHandler(userController.getUser.bind(userController)));

export default router;
