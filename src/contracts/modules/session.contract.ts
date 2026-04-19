import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  createSuccessResponseSchema,
  errorResponseSchema,
  sessionShapeSchema,
} from '@contracts/common.js';
import {
  createSessionBodySchema,
  joinSessionBodySchema,
  sessionIdParamSchema,
} from '@contracts/schemas.js';

const c = initContract();

export const sessionContract = c.router(
  {
    createSession: {
      method: 'POST',
      path: '/sessions',
      summary: 'Create a live session',
      body: createSessionBodySchema,
      responses: {
        201: createSuccessResponseSchema(sessionShapeSchema),
      },
      metadata: { tags: ['Session'] },
    },
    getSessionById: {
      method: 'GET',
      path: '/sessions/:sessionId',
      summary: 'Get session by id',
      pathParams: sessionIdParamSchema,
      responses: {
        200: createSuccessResponseSchema(sessionShapeSchema),
        404: errorResponseSchema,
      },
      metadata: { tags: ['Session'] },
    },
    joinSession: {
      method: 'POST',
      path: '/sessions/join',
      summary: 'Join a session by join code',
      body: joinSessionBodySchema,
      responses: {
        201: createSuccessResponseSchema(z.unknown()),
      },
      metadata: { tags: ['Session'] },
    },
    startSession: {
      method: 'POST',
      path: '/sessions/:sessionId/start',
      summary: 'Start session',
      pathParams: sessionIdParamSchema,
      body: c.noBody(),
      responses: {
        200: createSuccessResponseSchema(sessionShapeSchema),
      },
      metadata: { tags: ['Session'] },
    },
  },
  { metadata: { tags: ['Session'] } }
);
