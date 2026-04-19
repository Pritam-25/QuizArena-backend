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

export const createSuccessResponseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T
): z.ZodObject<{
  success: z.ZodLiteral<true>;
  message: z.ZodString;
  data: T;
  meta: typeof metaSchema;
}> =>
  z.object({
    success: z.literal(true),
    message: z.string(),
    data: dataSchema,
    meta: metaSchema,
  });

export const userShapeSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  email: z.string().email(),
});

export const quizShapeSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable().optional(),
  isPublished: z.boolean(),
  createdBy: z.string(),
});

export const questionShapeSchema = z.object({
  id: z.string().uuid(),
  quizId: z.string().uuid(),
  questionText: z.string(),
  type: z.string(),
  timeLimit: z.number().int(),
  points: z.number().int(),
});

export const sessionShapeSchema = z.object({
  id: z.string().uuid(),
  quizId: z.string().uuid(),
  hostId: z.string().uuid(),
  status: z.string(),
});
