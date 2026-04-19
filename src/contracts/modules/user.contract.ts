import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { createUserBodySchema, uuidParamSchema } from '@contracts/schemas.js';
import {
  createSuccessResponseSchema,
  errorResponseSchema,
  userShapeSchema,
} from '@contracts/common.js';

const c = initContract();

export const userContract = c.router(
  {
    createUser: {
      method: 'POST',
      path: '/users',
      summary: 'Create user',
      body: createUserBodySchema,
      responses: {
        201: createSuccessResponseSchema(userShapeSchema),
      },
      metadata: { tags: ['User'] },
    },
    getUserById: {
      method: 'GET',
      path: '/users/:id',
      summary: 'Get user by id',
      pathParams: uuidParamSchema,
      responses: {
        200: createSuccessResponseSchema(userShapeSchema),
        404: errorResponseSchema,
      },
      metadata: { tags: ['User'] },
    },
  },
  { metadata: { tags: ['User'] } }
);
