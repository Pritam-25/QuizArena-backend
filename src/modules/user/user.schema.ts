import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
