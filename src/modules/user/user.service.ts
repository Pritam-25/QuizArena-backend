import { UserRepository } from './user.repository.js';

export class UserService {
  constructor(private repo: UserRepository) {}

  async createUser(username?: string) {
    return this.repo.createUser(username || `guest_${Date.now()}`);
  }

  async getUserById(id: string) {
    return this.repo.findById(id);
  }
}
