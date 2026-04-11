import { prisma } from '@infrastructure/database/prismaClient.js';
import { toUserDomain } from './user.mapper.js';

export class UserRepository {
  async createUser(username: string) {
    const user = await prisma.user.create({
      data: {
        username,
      },
    });

    return toUserDomain(user);
  }

  async findByEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    return user ? toUserDomain(user) : null;
  }

  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    return user ? toUserDomain(user) : null;
  }
}
