import { SessionRepository } from './session.repository.js';
import { SessionService } from './session.service.js';
import { SessionController } from './session.controller.js';

/**
 * Creates and wires session module dependencies.
 * @returns Session controller, service, and repository instances
 */
export function createSessionModule() {
  const repo = new SessionRepository();
  const service = new SessionService(repo);
  const controller = new SessionController(service);

  return { controller, service, repo };
}
