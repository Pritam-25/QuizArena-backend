import { SessionStatus } from '@generated/prisma/enums.js';
import { z } from 'zod';
import { normalizeSessionJoinCode } from './utils/joinCode.js';

/**
 * Request body schema for creating a session.
 */
export const createSessionSchema = z.object({
  quizId: z
    .string({ required_error: 'quizId is required' })
    .uuid('quizId must be a valid UUID'),
});

export type CreateSessionInputDto = z.infer<typeof createSessionSchema>;

/**
 * Request body schema for joining a session by join code/link.
 */
export const joinSessionSchema = z.object({
  joinCode: z
    .string({ required_error: 'joinCode is required' })
    .trim()
    .min(1, 'joinCode is required')
    .transform(normalizeSessionJoinCode)
    .refine(val => z.string().uuid().safeParse(val).success, {
      message: 'joinCode must be a valid UUID or quizArena.com/<valid-uuid>',
    }),

  nickname: z
    .string({ required_error: 'nickname is required' })
    .trim()
    .min(1, 'nickname is required')
    .max(30, 'nickname must be at most 30 characters'),
});

export type JoinSessionInputDto = z.infer<typeof joinSessionSchema>;

/**
 * Request body schema for updating session status.
 */
export const updateSessionStatusSchema = z.object({
  status: z.nativeEnum(SessionStatus, {
    errorMap: () => ({ message: 'status is required' }),
  }),
});

export type UpdateSessionStatusDto = z.infer<typeof updateSessionStatusSchema>;
