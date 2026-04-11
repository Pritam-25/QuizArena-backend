import type { User } from '@generated/prisma/client.js';
import type { UserResponseDto } from './user.dto.js';

export function toUserResponseDto(user: User): UserResponseDto {
  return {
    id: user.id,
    username: user.username,
    isGuest: user.isGuest,
    createdAt: user.createdAt,
  };
}
