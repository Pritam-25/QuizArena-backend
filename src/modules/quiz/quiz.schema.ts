import { QuestionType } from '@generated/prisma/enums.js';
import { z } from 'zod';

export const createQuizSchema = z.object({
  title: z.string().min(3).trim(),
  description: z.string().trim().optional(),
  isPublished: z.boolean().default(false),
});

export const addQuestionSchema = z.object({
  questionText: z.string().min(1).trim(),
  type: z.enum(QuestionType).default(QuestionType.MCQ),
  timeLimit: z.number().int().nonnegative().default(30), // default 30 seconds
  points: z.number().int().nonnegative().default(1),
  order: z.number().int().nonnegative(),
});

export const addOptionsSchema = z.object({
  optionText: z.string().min(1).max(200).trim(),
  isCorrect: z.boolean().default(false),
});

export type CreateQuizInputDto = z.infer<typeof createQuizSchema>;
export type CreateQuizDto = CreateQuizInputDto & { createdBy: string };
export type AddQuestionDto = z.infer<typeof addQuestionSchema>;
export type AddOptionsDto = z.infer<typeof addOptionsSchema>;
