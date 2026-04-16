import { SessionStatus } from '@generated/prisma/enums.js';
import {
  addPlayer,
  createSessionState,
  setActiveQuestion,
  getActiveQuestion,
  getAllAnswers,
  clearQuestionAnswers,
  incrementScore,
  getLeaderboard,
  initLeaderboard,
  setSessionEnded,
} from '@infrastructure/redis/sessionState.repository.js';
import { scheduleQuestionEvaluation } from '@infrastructure/queue/sessionQueue.js';
import logger from '@infrastructure/logger/logger.js';
import { ApiError, ERROR_CODES } from '@shared/utils/errors/index.js';
import { statusCode } from '@shared/utils/http/statusCodes.js';
import type { SessionRepository } from './session.repository.js';
import type {
  CreateSessionDto,
  JoinSessionDto,
  JoinSessionResponseDto,
  SessionResponseDto,
  QuestionStartedPayload,
  QuestionEndedPayload,
  LeaderboardEntry,
} from './session.dto.js';
import {
  generateSessionJoinCode,
  normalizeSessionJoinCode,
  toSessionJoinLink,
} from './utils/joinCode.js';

export class SessionService {
  /**
   * Creates service instance for session business logic.
   * @param repo - Session repository instance
   */
  constructor(private repo: SessionRepository) {}

  // ─── Session Lifecycle ───────────────────────────────────────────────────────

  /**
   * Creates a new session.
   * @param data - CreateSessionDto (includes quizId, hostId)
   * @returns The created Session record with a user-facing join link
   * */
  async createSession(data: CreateSessionDto): Promise<SessionResponseDto> {
    const joinCode = generateSessionJoinCode();
    const session = await this.repo.createSession({
      quizId: data.quizId,
      hostId: data.hostId,
      joinCode,
    });

    try {
      await createSessionState(session.id);
    } catch (stateError) {
      logger.error(
        {
          sessionId: session.id,
          err: stateError,
        },
        'Failed to initialize Redis state for created session'
      );

      try {
        await this.repo.deleteSession(session.id);
        logger.warn(
          { sessionId: session.id },
          'Compensated session creation by deleting persisted session'
        );
      } catch (cleanupError) {
        logger.error(
          {
            sessionId: session.id,
            err: cleanupError,
          },
          'Failed to compensate session creation after Redis state failure'
        );
      }

      throw new ApiError(statusCode.internalError, ERROR_CODES.INTERNAL_ERROR);
    }

    return {
      ...session,
      joinCode: toSessionJoinLink(session.joinCode),
    };
  }

  /**
   * Finds a session by its Join Code.
   * @param joinCode - The Join Code of the session to find
   * @returns The Session record if found, otherwise null
   */
  async findSessionByJoinCode(joinCode: string) {
    const normalizedJoinCode = normalizeSessionJoinCode(joinCode);
    return await this.repo.findSessionByJoinCode(normalizedJoinCode);
  }

  /**
   * Finds a session by its ID.
   * @param sessionId - The ID of the session to find
   * @returns The Session record if found, otherwise null
   * */
  async findSessionById(sessionId: string) {
    return await this.repo.findSessionById(sessionId);
  }

  async joinSession(data: JoinSessionDto): Promise<JoinSessionResponseDto> {
    const session = await this.findSessionByJoinCode(data.joinCode);
    if (!session) {
      throw new ApiError(statusCode.notFound, ERROR_CODES.SESSION_NOT_FOUND);
    }

    if (session.status !== SessionStatus.WAITING) {
      throw new ApiError(
        statusCode.badRequest,
        ERROR_CODES.SESSION_NOT_JOINABLE
      );
    }

    const participant = await this.repo.addParticipant(
      session.id,
      data.nickname
    );

    try {
      await addPlayer(session.id, participant.id);
    } catch (addPlayerError) {
      logger.error(
        {
          sessionId: session.id,
          participantId: participant.id,
          err: addPlayerError,
        },
        'Failed to add participant to Redis player set after DB participant insert'
      );

      try {
        await this.repo.deleteParticipant(participant.id);
        logger.warn(
          {
            sessionId: session.id,
            participantId: participant.id,
          },
          'Compensated join by deleting persisted participant after Redis addPlayer failure'
        );
      } catch (cleanupError) {
        logger.error(
          {
            sessionId: session.id,
            participantId: participant.id,
            err: cleanupError,
          },
          'Failed to compensate join after Redis addPlayer failure'
        );
      }

      throw new ApiError(statusCode.internalError, ERROR_CODES.INTERNAL_ERROR);
    }

    return {
      sessionId: session.id,
      participant,
    };
  }

  async startSession(sessionId: string) {
    const session = await this.repo.findSessionById(sessionId);
    if (!session) {
      throw new ApiError(statusCode.notFound, ERROR_CODES.SESSION_NOT_FOUND);
    }

    if (session.status !== SessionStatus.WAITING) {
      throw new ApiError(
        statusCode.badRequest,
        ERROR_CODES.SESSION_NOT_STARTABLE
      );
    }

    const updated = await this.repo.updateSessionStatus(sessionId, {
      status: SessionStatus.LIVE,
      startedAt: new Date(),
      currentQuestionIndex: 0,
    });

    // Initialize leaderboard with all participants at score 0
    const participants = await this.repo.findParticipantsBySession(sessionId);
    const participantIds = participants.map(p => p.id);
    await initLeaderboard(sessionId, participantIds);

    return updated;
  }

  // ─── Question Flow ─────────────────────────────────────────────────────────

  /**
   * Advances to the next question. Only the host should call this.
   *
   * - Verifies session is LIVE
   * - Gets the next question from the quiz
   * - Sets the active question + deadline in Redis
   * - Schedules a BullMQ delayed job for auto-evaluation
   * - Returns the question payload (without correct answers) for broadcast
   */
  async advanceQuestion(sessionId: string): Promise<QuestionStartedPayload> {
    const session = await this.repo.findSessionWithQuestions(sessionId);
    if (!session) {
      throw new ApiError(statusCode.notFound, ERROR_CODES.SESSION_NOT_FOUND);
    }

    if (session.status !== SessionStatus.LIVE) {
      throw new ApiError(statusCode.badRequest, ERROR_CODES.SESSION_NOT_LIVE);
    }

    const questions = session.quiz.questions;
    const nextIndex = session.currentQuestionIndex;

    if (nextIndex >= questions.length) {
      throw new ApiError(
        statusCode.badRequest,
        ERROR_CODES.INVALID_QUESTION_INDEX
      );
    }

    const question = questions[nextIndex]!;
    const delayMs = question.timeLimit * 1000;
    const endsAt = Date.now() + delayMs;

    // Update Redis state with the active question
    await setActiveQuestion(sessionId, question.id, nextIndex, endsAt);

    // Increment the question index in DB for next advance call
    await this.repo.updateSessionStatus(sessionId, {
      currentQuestionIndex: nextIndex + 1,
    });

    // Schedule evaluation after the timer expires
    await scheduleQuestionEvaluation(sessionId, question.id, delayMs);

    // Return question payload WITHOUT correct answers
    return {
      question: {
        id: question.id,
        questionText: question.questionText,
        type: question.type,
        timeLimit: question.timeLimit,
        options: question.options.map(o => ({
          id: o.id,
          optionText: o.optionText,
        })),
      },
      questionIndex: nextIndex,
      totalQuestions: questions.length,
    };
  }

  // ─── Evaluation (Called by BullMQ Worker) ──────────────────────────────────

  /**
   * Evaluates all answers for a question after the timer expires.
   *
   * 1. Loads all answers from Redis
   * 2. Loads the question with correct options from DB
   * 3. Determines correctness per participant
   * 4. Increments Redis leaderboard scores
   * 5. Persists Answer rows to Postgres
   * 6. Returns the evaluation result for Socket.IO broadcast
   * 7. Marks session ENDED if this was the last question
   */
  async evaluateQuestion(
    sessionId: string,
    questionId: string
  ): Promise<{
    result: QuestionEndedPayload;
    isLastQuestion: boolean;
    finalLeaderboard?: LeaderboardEntry[];
  }> {
    // 1. Get all answers from Redis
    const rawAnswers = await getAllAnswers(sessionId, questionId);

    // 2. Load question with options
    const question = await this.repo.findQuestionWithOptions(questionId);
    if (!question) {
      logger.error(
        { sessionId, questionId },
        'Question not found during evaluation'
      );
      throw new ApiError(statusCode.notFound, ERROR_CODES.QUESTION_NOT_FOUND);
    }

    // Determine correct answer(s)
    const correctOptions = question.options.filter(o => o.isCorrect);
    const firstCorrect = correctOptions[0];
    const correctOptionId = firstCorrect?.id ?? null;
    const correctAnswerText = firstCorrect?.optionText ?? null;

    // 3. Evaluate each participant's answer
    const answerBatch: {
      participantId: string;
      questionId: string;
      optionId: string | null;
      answerText: string | null;
      isCorrect: boolean;
      scoreEarned: number;
    }[] = [];

    const scoreUpdates: { participantId: string; points: number }[] = [];

    for (const [participantId, value] of Object.entries(rawAnswers)) {
      let isCorrect = false;
      let optionId: string | null = null;
      let answerText: string | null = null;

      if (value.startsWith('text:')) {
        // Fill-in-the-blank answer
        answerText = value.slice(5);
        // Case-insensitive exact match against any correct option text
        isCorrect = correctOptions.some(
          o => o.optionText.toLowerCase() === answerText!.toLowerCase()
        );
      } else {
        // Option-based answer (MCQ, TRUE_FALSE, MULTI_SELECT)
        optionId = value;
        isCorrect = correctOptions.some(o => o.id === optionId);
      }

      const scoreEarned = isCorrect ? question.points : 0;

      answerBatch.push({
        participantId,
        questionId: question.id,
        optionId,
        answerText,
        isCorrect,
        scoreEarned,
      });

      if (scoreEarned > 0) {
        scoreUpdates.push({ participantId, points: scoreEarned });
      }
    }

    // 4. Increment Redis leaderboard scores
    await Promise.all(
      scoreUpdates.map(({ participantId, points }) =>
        incrementScore(sessionId, participantId, points)
      )
    );

    // 5. Persist answer rows to Postgres
    try {
      await this.repo.createAnswerBatch(answerBatch);
    } catch (persistError) {
      logger.error(
        { sessionId, questionId, err: persistError },
        'Failed to persist answer batch to DB'
      );
      // Non-fatal: leaderboard is already updated in Redis, we continue
    }

    // 6. Get updated leaderboard
    const leaderboardRaw = await getLeaderboard(sessionId);

    // Enrich leaderboard with nicknames
    const participants = await this.repo.findParticipantsBySession(sessionId);
    const nicknameMap = new Map(participants.map(p => [p.id, p.nickname]));

    const leaderboard: LeaderboardEntry[] = leaderboardRaw.map(
      (entry, index) => ({
        participantId: entry.participantId,
        nickname: nicknameMap.get(entry.participantId) ?? 'Unknown',
        score: entry.score,
        rank: index + 1,
      })
    );

    // 7. Clean up Redis answers for this question
    await clearQuestionAnswers(sessionId, questionId);

    // 8. Check if this was the last question
    const session = await this.repo.findSessionWithQuestions(sessionId);
    const isLastQuestion =
      !!session &&
      session.currentQuestionIndex >= session.quiz.questions.length;

    if (isLastQuestion && session) {
      // Mark session as ENDED in both DB and Redis
      await this.repo.updateSessionStatus(sessionId, {
        status: SessionStatus.ENDED,
        endedAt: new Date(),
      });
      await setSessionEnded(sessionId);

      // Sync final scores from Redis to DB
      try {
        await this.repo.updateParticipantScores(
          leaderboard.map(e => ({
            participantId: e.participantId,
            score: e.score,
          }))
        );
      } catch (syncError) {
        logger.error(
          { sessionId, err: syncError },
          'Failed to sync final scores to DB'
        );
      }
    }

    const result: QuestionEndedPayload = {
      correctOptionId,
      correctAnswerText,
      leaderboard,
    };

    return {
      result,
      isLastQuestion,
      ...(isLastQuestion ? { finalLeaderboard: leaderboard } : {}),
    };
  }
}
