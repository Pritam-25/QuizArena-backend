import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { createUserSchema } from '@modules/user/user.schema.js';

const c = initContract();

export const userContract = c.router(
  {
    createUser: {
      method: 'POST',
      path: '/users',
      summary: 'Create user',
      body: createUserSchema,
      responses: {
        201: z.object({
          message: z.string(),
          data: z.unknown(),
        }),
      },
      metadata: { tags: ['User'] },
    },
    getUserById: {
      method: 'GET',
      path: '/users/:id',
      summary: 'Get user by id',
      pathParams: z.object({ id: z.uuid() }),
      responses: {
        200: z.object({
          message: z.string(),
          data: z.unknown(),
        }),
        404: z.object({
          message: z.string(),
        }),
      },
      metadata: { tags: ['User'] },
    },
  },
  { metadata: { tags: ['User'] } }
);
