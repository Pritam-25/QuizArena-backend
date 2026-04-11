import type { User } from '@generated/prisma/client.js';
import type { AuthResponseDto } from './auth.dto.js';

export function toAuthResponseDto(user: User, token: string): AuthResponseDto {
  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email!,
      isGuest: user.isGuest,
      createdAt: user.createdAt,
    },
  };
}
