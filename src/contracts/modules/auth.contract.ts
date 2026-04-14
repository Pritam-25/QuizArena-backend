import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { loginSchema, registerSchema } from '@modules/auth/auth.schema.js';
import {
  createSuccessResponseSchema,
  errorResponseSchema,
  userShapeSchema,
} from '@contracts/common.js';

const c = initContract();

export const authContract = c.router(
  {
    register: {
      method: 'POST',
      path: '/auth/register',
      summary: 'Register a new user',
      body: registerSchema,
      responses: {
        201: createSuccessResponseSchema(z.object({ user: userShapeSchema })),
        409: errorResponseSchema,
      },
      metadata: { tags: ['Auth'] },
    },
    login: {
      method: 'POST',
      path: '/auth/login',
      summary: 'Authenticate a user',
      body: loginSchema,
      responses: {
        200: createSuccessResponseSchema(z.object({ user: userShapeSchema })),
        401: errorResponseSchema,
      },
      metadata: { tags: ['Auth'] },
    },
    me: {
      method: 'GET',
      path: '/auth/me',
      summary: 'Get current authenticated user',
      responses: {
        200: createSuccessResponseSchema(z.object({ user: userShapeSchema })),
        401: errorResponseSchema,
      },
      metadata: { tags: ['Auth'] },
    },
  },
  { metadata: { tags: ['Auth'] } }
);
