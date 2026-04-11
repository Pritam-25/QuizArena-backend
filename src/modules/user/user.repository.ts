import { prisma } from '@infrastructure/database/prismaClient.js';

export class UserRepository {
  async createUser(username: string) {
    return prisma.user.create({
      data: {
        username,
      },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }
}
