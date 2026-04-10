import { UserRepository } from './user.repository.js';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';

export function createUserModule() {
  const repo = new UserRepository();
  const service = new UserService(repo);
  const controller = new UserController(service);

  return { controller, service, repo };
}
