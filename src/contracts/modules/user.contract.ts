import { initContract } from '@ts-rest/core';
import { z } from 'zod3';
import { createUserBodySchema, uuidParamSchema } from '@contracts/schemas.js';

const c = initContract();

export const userContract = c.router(
  {
    createUser: {
      method: 'POST',
      path: '/users',
      summary: 'Create user',
      body: createUserBodySchema,
      responses: {
        201: z
          .object({
            message: z.string(),
            data: z.unknown(),
          })
          .passthrough() as any,
      },
      metadata: { tags: ['User'] },
    },
    getUserById: {
      method: 'GET',
      path: '/users/:id',
      summary: 'Get user by id',
      pathParams: uuidParamSchema,
      responses: {
        200: z
          .object({
            message: z.string(),
            data: z.unknown(),
          })
          .passthrough() as any,
        404: z
          .object({
            message: z.string(),
          })
          .passthrough() as any,
      },
      metadata: { tags: ['User'] },
    },
  },
  { metadata: { tags: ['User'] } }
);
