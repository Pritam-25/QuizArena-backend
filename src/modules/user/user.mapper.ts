import type { User } from '@generated/prisma/client.js';

export function toUserDomain(user: User) {
  return {
    id: user.id,
    username: user.username,
    isGuest: user.isGuest,
    createdAt: user.createdAt,
  };
}
