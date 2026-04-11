import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';

export function createAuthModule() {
  const repo = new AuthRepository();
  const service = new AuthService(repo);
  const controller = new AuthController(service);

  return { controller, service, repo };
}
