import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string({
      error: issue =>
        issue.input === undefined ? 'username is required' : undefined,
    })
    .trim()
    .min(1),
  email: z
    .email({
      error: issue =>
        issue.input === undefined ? 'email is required' : undefined,
    })
    .trim(),
  password: z
    .string({
      error: issue =>
        issue.input === undefined ? 'password is required' : undefined,
    })
    .min(6)
    .trim(),
});

export const loginSchema = z.object({
  email: z
    .email({
      error: issue =>
        issue.input === undefined ? 'email is required' : undefined,
    })
    .trim(),
  password: z
    .string({
      error: issue =>
        issue.input === undefined ? 'password is required' : undefined,
    })
    .min(1)
    .trim(),
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
