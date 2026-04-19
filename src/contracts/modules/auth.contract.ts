import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  createSuccessResponseSchema,
  errorResponseSchema,
  userShapeSchema,
} from '@contracts/common.js';
import { loginBodySchema, registerBodySchema } from '@contracts/schemas.js';

const c = initContract();

export const authContract = c.router(
  {
    register: {
      method: 'POST',
      path: '/auth/register',
      summary: 'Register a new user',
      body: registerBodySchema,
      responses: {
        201: createSuccessResponseSchema(userShapeSchema),
        409: errorResponseSchema,
      },
      metadata: { tags: ['Auth'] },
    },
    login: {
      method: 'POST',
      path: '/auth/login',
      summary: 'Authenticate a user',
      body: loginBodySchema,
      responses: {
        200: createSuccessResponseSchema(userShapeSchema),
        401: errorResponseSchema,
      },
      metadata: { tags: ['Auth'] },
    },
    me: {
      method: 'GET',
      path: '/auth/me',
      summary: 'Get current authenticated user',
      responses: {
        200: createSuccessResponseSchema(userShapeSchema),
        401: errorResponseSchema,
      },
      metadata: { tags: ['Auth'] },
    },
  },
  { metadata: { tags: ['Auth'] } }
);
