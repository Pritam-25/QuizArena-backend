import { UserRepository } from './user.repository.js';
import type { CreateUserDto } from './user.schema.js';
import { toUserResponseDto } from './user.mapper.js';

export class UserService {
  constructor(private repo: UserRepository) {}

  async createUser(data: CreateUserDto) {
    const user = await this.repo.createUser(
      data.username || `guest_${Date.now()}`
    );
    return toUserResponseDto(user);
  }

  async getUserById(id: string) {
    const user = await this.repo.findById(id);
    if (!user) return null;
    return toUserResponseDto(user);
  }
}
