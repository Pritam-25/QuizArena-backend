import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string({ required_error: 'username is required' })
    .trim()
    .min(1, 'username cannot be empty'),

  email: z
    .string({ required_error: 'email is required' })
    .trim()
    .email('invalid email'),

  password: z
    .string({ required_error: 'password is required' })
    .trim()
    .min(6, 'password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'email is required' })
    .trim()
    .email('invalid email'),

  password: z
    .string({ required_error: 'password is required' })
    .trim()
    .min(1, 'password cannot be empty'),
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
