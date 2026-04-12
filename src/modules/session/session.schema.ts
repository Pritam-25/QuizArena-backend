import { SessionStatus } from '@generated/prisma/enums.js';
import { z } from 'zod';
import { normalizeSessionJoinCode } from './utils/joinCode.js';

/**
 * Request body schema for creating a session.
 */
export const createSessionSchema = z.object({
  quizId: z.uuid({
    error: issue =>
      issue.input === undefined ? 'quizId is required' : undefined,
  }),
  hostId: z.uuid({
    error: issue =>
      issue.input === undefined ? 'hostId is required' : undefined,
  }),
});

/**
 * Data Transfer Object for creating a session.
 */
export type CreateSessionInputDto = z.infer<typeof createSessionSchema>;

/**
 * Request body schema for joining a session by join code/link.
 */
export const joinSessionSchema = z.object({
  joinCode: z
    .string({
      error: issue =>
        issue.input === undefined ? 'joinCode is required' : undefined,
    })
    .trim()
    .min(1, { error: 'joinCode is required' })
    .transform(normalizeSessionJoinCode)
    .pipe(
      z.uuid({
        error: 'joinCode must be a valid UUID or quizArena.com/<valid-uuid>',
      })
    ),
  nickname: z
    .string({
      error: issue =>
        issue.input === undefined ? 'nickname is required' : undefined,
    })
    .trim()
    .min(1, { error: 'nickname is required' })
    .max(30, { error: 'nickname must be at most 30 characters' }),
});

/**
 * Data Transfer Object for joining a session.
 */
export type JoinSessionInputDto = z.infer<typeof joinSessionSchema>;

/**
 * Request body schema for updating session status.
 */
export const updateSessionStatusSchema = z.object({
  status: z.enum(SessionStatus, {
    error: issue =>
      issue.input === undefined ? 'status is required' : undefined,
  }),
});

/**
 * Data Transfer Object for updating session status.
 */
export type UpdateSessionStatusDto = z.infer<typeof updateSessionStatusSchema>;
