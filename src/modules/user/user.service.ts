import { UserRepository } from './user.repository.js';
import type { CreateUserDto } from './user.schema.js';

export class UserService {
  constructor(private repo: UserRepository) {}

  async createUser(data: CreateUserDto) {
    return this.repo.createUser(data.username || `guest_${Date.now()}`);
  }

  async getUserById(id: string) {
    return this.repo.findById(id);
  }
}
