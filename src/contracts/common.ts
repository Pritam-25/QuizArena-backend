import { z } from 'zod3';

export const metaSchema = z.record(z.string(), z.unknown()).optional();

export const errorResponseSchema: any = z.object({
  success: z.literal(false),
  error: z.object({
    statusCode: z.number().int(),
    errorCode: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
  meta: metaSchema,
});

export const createSuccessResponseSchema = (dataSchema: any): any =>
  z.object({
    success: z.literal(true),
    message: z.string(),
    ...dataSchema.shape,
    meta: metaSchema,
  });

export const userShapeSchema: any = z.object({
  id: z.string().uuid(),
  username: z.string(),
  email: z.string().email(),
});

export const quizShapeSchema: any = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable().optional(),
  isPublished: z.boolean(),
  createdBy: z.string(),
});

export const questionShapeSchema: any = z.object({
  id: z.string().uuid(),
  quizId: z.string().uuid(),
  questionText: z.string(),
  type: z.string(),
  timeLimit: z.number().int(),
  points: z.number().int(),
});

export const sessionShapeSchema: any = z.object({
  id: z.string().uuid(),
  quizId: z.string().uuid(),
  hostId: z.string().uuid(),
  status: z.string(),
});
