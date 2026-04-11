import { prisma } from '@infrastructure/database/prismaClient.js';
import type { User } from '@generated/prisma/client.js';

export class AuthRepository {
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async createUser(data: {
    username: string;
    email: string;
    password: string;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: data.password,
        isGuest: false,
      },
    });
  }
}
