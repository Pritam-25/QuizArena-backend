import { redis } from '@infrastructure/redis/redisClient.js';
import type { SessionState } from '@modules/session/domain/session.machine.js';

// ─── Key Builders ────────────────────────────────────────────────────────────

export const sessionStateKey = (id: string) => `session:${id}`;
export const playersKey = (id: string) => `session:${id}:players`;
export const answersKey = (sessionId: string, questionId: string) =>
  `session:${sessionId}:answers:${questionId}`;
export const leaderboardKey = (id: string) => `session:${id}:leaderboard`;

// ─── Session Lifecycle ───────────────────────────────────────────────────────

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

// ─── Active Question State ───────────────────────────────────────────────────

/**
 * Sets the active question and its deadline in Redis session state.
 */
export async function setActiveQuestion(
  sessionId: string,
  questionId: string,
  questionIndex: number,
  endsAt: number
) {
  await redis.hset(sessionStateKey(sessionId), {
    state: 'QUESTION',
    questionIndex: String(questionIndex),
    activeQuestionId: questionId,
    questionEndsAt: String(endsAt),
  });
}

/**
 * Returns the active question state for a session, or null if not set.
 */
export async function getActiveQuestion(sessionId: string) {
  const data = await redis.hgetall(sessionStateKey(sessionId));
  if (!data || !data.activeQuestionId) {
    return null;
  }

  return {
    state: data.state as SessionState,
    questionIndex: Number(data.questionIndex),
    activeQuestionId: data.activeQuestionId,
    questionEndsAt: Number(data.questionEndsAt),
  };
}

// ─── Answer State (Overwrite-Friendly) ───────────────────────────────────────

/**
 * Stores or overwrites a participant's answer for the current question.
 * Uses Redis HSET so subsequent calls replace the previous value.
 *
 * Value format: `optionId` for option-based, or `text:<answerText>` for fill-in.
 */
export async function updateAnswer(
  sessionId: string,
  questionId: string,
  participantId: string,
  value: string
) {
  await redis.hset(answersKey(sessionId, questionId), participantId, value);
}

/**
 * Returns all participant answers for a question: `{ participantId: value }`.
 */
export async function getAllAnswers(
  sessionId: string,
  questionId: string
): Promise<Record<string, string>> {
  return redis.hgetall(answersKey(sessionId, questionId));
}

/**
 * Removes the answers hash for a question after evaluation + DB persist.
 */
export async function clearQuestionAnswers(
  sessionId: string,
  questionId: string
) {
  await redis.del(answersKey(sessionId, questionId));
}

// ─── Leaderboard (Sorted Set) ────────────────────────────────────────────────

/**
 * Initializes all participants in the leaderboard ZSET at score 0.
 */
export async function initLeaderboard(
  sessionId: string,
  participantIds: string[]
) {
  if (participantIds.length === 0) return;

  const args: (string | number)[] = [];
  for (const id of participantIds) {
    args.push(0, id);
  }

  await redis.zadd(leaderboardKey(sessionId), ...args);
}

/**
 * Atomically increments a participant's leaderboard score.
 */
export async function incrementScore(
  sessionId: string,
  participantId: string,
  points: number
) {
  await redis.zincrby(leaderboardKey(sessionId), points, participantId);
}

/**
 * Returns the leaderboard as a ranked array (highest score first).
 */
export async function getLeaderboard(
  sessionId: string
): Promise<{ participantId: string; score: number }[]> {
  const raw = await redis.zrevrange(
    leaderboardKey(sessionId),
    0,
    -1,
    'WITHSCORES'
  );

  const result: { participantId: string; score: number }[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    const participantId = raw[i]!;
    const score = Number(raw[i + 1]);
    result.push({ participantId, score });
  }

  return result;
}

// ─── Session End State ───────────────────────────────────────────────────────

/**
 * Marks the session state as ENDED in Redis.
 */
export async function setSessionEnded(sessionId: string) {
  await redis.hset(sessionStateKey(sessionId), {
    state: 'ENDED',
    activeQuestionId: '',
    questionEndsAt: '0',
  });
}
