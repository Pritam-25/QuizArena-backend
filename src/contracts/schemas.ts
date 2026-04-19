import { z } from 'zod';

export const uuidParamSchema: any = z.object({
  id: z.string().uuid().default('123e4567-e89b-12d3-a456-426614174000'),
});

export const quizIdParamSchema: any = z.object({
  quizId: z.string().uuid().default('123e4567-e89b-12d3-a456-426614174000'),
});

export const questionIdParamSchema: any = z.object({
  questionId: z.string().uuid().default('123e4567-e89b-12d3-a456-426614174000'),
});

export const sessionIdParamSchema: any = z.object({
  sessionId: z.string().uuid().default('123e4567-e89b-12d3-a456-426614174000'),
});

export const registerBodySchema: any = z.object({
  username: z.string().min(1).default('john_doe'),
  email: z.string().email().default('john@example.com'),
  password: z.string().min(6).default('password123'),
});

export const loginBodySchema: any = z.object({
  email: z.string().email().default('john@example.com'),
  password: z.string().min(6).default('password123'),
});

export const createUserBodySchema: any = z.object({
  username: z.string().default('guest_player'),
});

export const createQuizBodySchema: any = z.object({
  title: z.string().min(3).default('General Knowledge Quiz'),
  description: z.string().default('A mixed quiz for all players'),
  isPublished: z.boolean().default(false),
});

export const addQuestionBodySchema: any = z.object({
  questionText: z.string().min(1).default('What is the capital of France?'),
  type: z.string().default('MCQ'),
  timeLimit: z.number().int().nonnegative().default(30),
  points: z.number().int().nonnegative().default(1),
  prevOrder: z
    .string()
    .regex(/^[a-z]+$/)
    .optional()
    .default('a'),
  nextOrder: z
    .string()
    .regex(/^[a-z]+$/)
    .optional()
    .default('c'),
});

export const addOptionsItemBodySchema: any = z.object({
  optionText: z.string().min(1).max(200).default('Paris'),
  isCorrect: z.boolean().default(true),
});

export const reorderQuestionBodySchema: any = z.object({
  prevReorderToken: z
    .string()
    .regex(/^[a-z]+$/)
    .optional()
    .default('a'),
  nextReorderToken: z
    .string()
    .regex(/^[a-z]+$/)
    .optional()
    .default('c'),
});

export const createSessionBodySchema: any = z.object({
  quizId: z.string().uuid().default('123e4567-e89b-12d3-a456-426614174000'),
});

export const joinSessionBodySchema: any = z.object({
  joinCode: z.string().min(1).default('123e4567-e89b-12d3-a456-426614174000'),
  nickname: z.string().min(1).max(30).default('PlayerOne'),
});
