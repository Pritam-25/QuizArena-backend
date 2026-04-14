import { redis } from '@infrastructure/redis/redisClient.js';
import type { SessionState } from '@modules/session/domain/session.machine.js';

export const sessionStateKey = (id: string) => `session:${id}`;
export const playersKey = (id: string) => `session:${id}:players`;

const INITIAL_SESSION_STATE: SessionState = 'WAITING';

export async function createSessionState(sessionId: string) {
  await redis.hset(sessionStateKey(sessionId), {
    state: INITIAL_SESSION_STATE,
    questionIndex: '0',
  });
}

export async function addPlayer(sessionId: string, userId: string) {
  await redis.sadd(playersKey(sessionId), userId);
}
