import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';

/**
 * Builds and wires Auth module dependencies.
 * @returns Auth controller, service, and repository instances
 */
export function createAuthModule() {
  const repo = new AuthRepository();
  const service = new AuthService(repo);
  const controller = new AuthController(service);

  return { controller, service, repo };
}
