import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().trim().optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
