import { z } from 'zod';

export const metaSchema = z.record(z.string(), z.unknown()).optional();

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    statusCode: z.number().int(),
    errorCode: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
  meta: metaSchema,
});

export const createSuccessResponseSchema = (dataSchema: z.ZodTypeAny) =>
  z.object({
    success: z.literal(true),
    message: z.string(),
    data: dataSchema.optional(),
    meta: metaSchema,
  });

export const userShapeSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  email: z.email(),
});

export const quizShapeSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable().optional(),
  isPublished: z.boolean(),
  createdBy: z.string(),
});

export const questionShapeSchema = z.object({
  id: z.uuid(),
  quizId: z.uuid(),
  questionText: z.string(),
  type: z.string(),
  timeLimit: z.number().int(),
  points: z.number().int(),
});

export const sessionShapeSchema = z.object({
  id: z.uuid(),
  quizId: z.uuid(),
  hostId: z.uuid(),
  status: z.string(),
});
