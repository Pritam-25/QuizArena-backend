import { prisma } from '@infrastructure/database/prismaClient.js';
import type { User } from '@generated/prisma/client.js';

export class AuthRepository {
  /**
   * Finds a user by email.
   * @param email - User email
   * @returns Matching user or null when not found
   */
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Finds a user by id.
   * @param id - User id
   * @returns Matching user or null when not found
   */
  async findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Creates a registered (non-guest) user.
   * @param data - User creation payload
   * @returns Created user record
   */
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
