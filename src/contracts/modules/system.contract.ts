import { initContract } from '@ts-rest/core';
import { z } from 'zod3';
import { createSuccessResponseSchema } from '@contracts/common.js';

const c = initContract();

export const systemContract = c.router(
  {
    healthCheck: {
      method: 'GET',
      path: '/health',
      summary: 'Health check endpoint',
      responses: {
        200: createSuccessResponseSchema(
          z
            .object({
              status: z.literal('healthy'),
              timestamp: z.string(),
              uptime: z.number(),
            })
            .passthrough()
        ),
      },
      metadata: { tags: ['System'] },
    },
  },
  { metadata: { tags: ['System'] } }
);
