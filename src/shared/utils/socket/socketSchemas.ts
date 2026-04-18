import { z } from 'zod';
import { SOCKET_EVENTS } from './socketEvents.js';

// ─── Individual payload schemas ───────────────────────────────────────────────

export const sessionJoinSchema = z.object({
  joinCode: z.string().min(1, 'joinCode is required'),
  nickname: z
    .string()
    .min(1, 'nickname is required')
    .max(30, 'nickname must be 30 characters or fewer'),
});

export const sessionHostJoinSchema = z.object({
  sessionId: z.uuid('sessionId must be a valid UUID'),
});

export const sessionStartSchema = z.object({
  sessionId: z.uuid('sessionId must be a valid UUID'),
});

export const questionNextSchema = z.object({
  sessionId: z.uuid('sessionId must be a valid UUID'),
});

export const answerUpdateSchema = z
  .object({
    questionId: z.uuid('questionId must be a valid UUID'),
    optionId: z.uuid('optionId must be a valid UUID').optional(),
    answerText: z
      .string()
      .max(500, 'answerText must be 500 characters or fewer')
      .optional(),
  })
  .refine(
    data => data.optionId !== undefined || data.answerText !== undefined,
    {
      message: 'Either optionId or answerText must be provided',
    }
  );

// ─── Inferred types ───────────────────────────────────────────────────────────

export type SessionJoinPayload = z.infer<typeof sessionJoinSchema>;
export type SessionHostJoinPayload = z.infer<typeof sessionHostJoinSchema>;
export type SessionStartPayload = z.infer<typeof sessionStartSchema>;
export type QuestionNextPayload = z.infer<typeof questionNextSchema>;
export type AnswerUpdatePayload = z.infer<typeof answerUpdateSchema>;

// ─── Event → schema lookup map ────────────────────────────────────────────────

/**
 * Maps every ClientToServer event name to its Zod validation schema.
 *
 * Use this with `parseSocketPayload` inside event handlers to validate incoming
 * data at runtime before touching any business logic.
 */
export const CLIENT_EVENT_SCHEMAS = {
  [SOCKET_EVENTS.SESSION_JOIN]: sessionJoinSchema,
  [SOCKET_EVENTS.SESSION_HOST_JOIN]: sessionHostJoinSchema,
  [SOCKET_EVENTS.SESSION_START]: sessionStartSchema,
  [SOCKET_EVENTS.QUESTION_NEXT]: questionNextSchema,
  [SOCKET_EVENTS.ANSWER_UPDATE]: answerUpdateSchema,
} as const;
