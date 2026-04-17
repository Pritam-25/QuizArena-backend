import { redis } from '@infrastructure/redis/redisClient.js';
import { SessionStateRepository } from '@infrastructure/redis/sessionState.repository.js';
import { SessionQueue } from '@infrastructure/queue/sessionQueue.js';
import { SessionRepository } from './session.repository.js';
import { SessionService } from './session.service.js';
import { SessionController } from './session.controller.js';

/**
 * Creates and wires all session module dependencies.
 *
 * This is the composition root for the session module. It builds the
 * dependency graph bottom-up:
 *   redis client → repositories → service → controller
 *
 * @returns Fully wired session module instances
 */
export function createSessionModule() {
  const stateRepo = new SessionStateRepository(redis);
  const sessionQueue = new SessionQueue(redis);
  const repo = new SessionRepository();
  const service = new SessionService(repo, stateRepo, sessionQueue);
  const controller = new SessionController(service);

  return { controller, service, repo, stateRepo, sessionQueue };
}
