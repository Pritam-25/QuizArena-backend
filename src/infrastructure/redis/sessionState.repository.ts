import type { Redis } from 'ioredis';
import type { SessionState } from '@modules/session/domain/session.machine.js';

// ─── Key Builders (private, file-scoped) ─────────────────────────────────────

const sessionStateKey = (id: string) => `session:${id}`;
const playersKey = (id: string) => `session:${id}:players`;
const answersKey = (sessionId: string, questionId: string) =>
  `session:${sessionId}:answers:${questionId}`;
const leaderboardKey = (id: string) => `session:${id}:leaderboard`;

// ─── Repository ───────────────────────────────────────────────────────────────

/**
 * Redis-backed repository for ephemeral session state (question timers,
 * answers, leaderboard). The `redis` client is injected so the class
 * can be mocked in unit tests without touching the real ioredis singleton.
 */
export class SessionStateRepository {
  private static readonly INITIAL_STATE: SessionState = 'WAITING';

  constructor(private readonly redis: Redis) {}

  // ─── Session Lifecycle ──────────────────────────────────────────────────────

  async createSessionState(sessionId: string): Promise<void> {
    await this.redis.hset(sessionStateKey(sessionId), {
      state: SessionStateRepository.INITIAL_STATE,
      questionIndex: '0',
    });
  }

  async addPlayer(sessionId: string, userId: string): Promise<void> {
    await this.redis.sadd(playersKey(sessionId), userId);
  }

  // ─── Active Question State ──────────────────────────────────────────────────

  /**
   * Sets the active question and its deadline in Redis session state.
   */
  async setActiveQuestion(
    sessionId: string,
    questionId: string,
    questionIndex: number,
    endsAt: number
  ): Promise<void> {
    await this.redis.hset(sessionStateKey(sessionId), {
      state: 'QUESTION',
      questionIndex: String(questionIndex),
      activeQuestionId: questionId,
      questionEndsAt: String(endsAt),
    });
  }

  /**
   * Returns the active question state for a session, or null if not set.
   */
  async getActiveQuestion(sessionId: string) {
    const data = await this.redis.hgetall(sessionStateKey(sessionId));
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

  // ─── Answer State (Overwrite-Friendly) ─────────────────────────────────────

  /**
   * Stores or overwrites a participant's answer for the current question.
   * Uses HSET so subsequent calls replace the previous value.
   *
   * Value format: `optionId` for option-based, or `text:<answerText>` for fill-in.
   */
  async updateAnswer(
    sessionId: string,
    questionId: string,
    participantId: string,
    value: string
  ): Promise<void> {
    await this.redis.hset(
      answersKey(sessionId, questionId),
      participantId,
      value
    );
  }

  /**
   * Returns all participant answers for a question: `{ participantId: value }`.
   */
  async getAllAnswers(
    sessionId: string,
    questionId: string
  ): Promise<Record<string, string>> {
    return this.redis.hgetall(answersKey(sessionId, questionId));
  }

  /**
   * Removes the answers hash for a question after evaluation + DB persist.
   */
  async clearQuestionAnswers(
    sessionId: string,
    questionId: string
  ): Promise<void> {
    await this.redis.del(answersKey(sessionId, questionId));
  }

  // ─── Leaderboard (Sorted Set) ───────────────────────────────────────────────

  /**
   * Initializes all participants in the leaderboard ZSET at score 0.
   */
  async initLeaderboard(
    sessionId: string,
    participantIds: string[]
  ): Promise<void> {
    if (participantIds.length === 0) return;

    const args: (string | number)[] = [];
    for (const id of participantIds) {
      args.push(0, id);
    }

    await this.redis.zadd(leaderboardKey(sessionId), ...args);
  }

  /**
   * Atomically increments a participant's leaderboard score.
   */
  async incrementScore(
    sessionId: string,
    participantId: string,
    points: number
  ): Promise<void> {
    await this.redis.zincrby(leaderboardKey(sessionId), points, participantId);
  }

  /**
   * Returns the leaderboard as a ranked array (highest score first).
   */
  async getLeaderboard(
    sessionId: string
  ): Promise<{ participantId: string; score: number }[]> {
    const raw = await this.redis.zrevrange(
      leaderboardKey(sessionId),
      0,
      -1,
      'WITHSCORES'
    );

    const result: { participantId: string; score: number }[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      result.push({ participantId: raw[i]!, score: Number(raw[i + 1]) });
    }

    return result;
  }

  // ─── Session End State ──────────────────────────────────────────────────────

  /**
   * Marks the session state as ENDED in Redis.
   */
  async setSessionEnded(sessionId: string): Promise<void> {
    await this.redis.hset(sessionStateKey(sessionId), {
      state: 'ENDED',
      activeQuestionId: '',
      questionEndsAt: '0',
    });
  }
}
