import { SessionStatus } from '@generated/prisma/enums.js';
import logger from '@infrastructure/logger/logger.js';
import { ApiError, ERROR_CODES } from '@shared/utils/errors/index.js';
import { statusCode } from '@shared/utils/http/statusCodes.js';
import type { SessionStateRepository } from '@infrastructure/redis/sessionState.repository.js';
import type { SessionQueue } from '@infrastructure/queue/sessionQueue.js';
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
   *
   * @param repo        - Prisma-backed session repository (DB)
   * @param stateRepo   - Redis-backed session state repository (ephemeral)
   * @param sessionQueue - BullMQ queue for delayed evaluation jobs
   */
  constructor(
    private readonly repo: SessionRepository,
    private readonly stateRepo: SessionStateRepository,
    private readonly sessionQueue: SessionQueue
  ) {}

  // ─── Session Lifecycle ────────────────────────────────────────────────────────

  /**
   * Creates a new session.
   * @param data - CreateSessionDto (includes quizId, hostId)
   * @returns The created Session record with a user-facing join link
   */
  async createSession(data: CreateSessionDto): Promise<SessionResponseDto> {
    const joinCode = generateSessionJoinCode();
    const session = await this.repo.createSession({
      quizId: data.quizId,
      hostId: data.hostId,
      joinCode,
    });

    try {
      await this.stateRepo.createSessionState(session.id);
    } catch (stateError) {
      logger.error(
        { sessionId: session.id, err: stateError },
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
          { sessionId: session.id, err: cleanupError },
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
   */
  async findSessionByJoinCode(joinCode: string) {
    const normalizedJoinCode = normalizeSessionJoinCode(joinCode);
    return await this.repo.findSessionByJoinCode(normalizedJoinCode);
  }

  /**
   * Finds a session by its ID.
   */
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
      await this.stateRepo.addPlayer(session.id, participant.id);
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
          { sessionId: session.id, participantId: participant.id },
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
    await this.stateRepo.initLeaderboard(sessionId, participantIds);

    return updated;
  }

  /**
   * Returns the current participant list for a session (id, nickname, score).
   */
  async getSessionParticipants(sessionId: string) {
    return this.repo.findParticipantsBySession(sessionId);
  }

  /**
   * Validates and records a participant's answer for the currently active question.
   *
   * Rules enforced here (not in the socket handler):
   * - A question must be active for this session
   * - The submitted questionId must match the active question
   * - The question timer must not have expired
   * - Exactly one of optionId or answerText must be present
   *
   * @throws ApiError NO_ACTIVE_QUESTION    – no active question or id mismatch
   * @throws ApiError QUESTION_TIMER_EXPIRED – submission is after deadline
   * @throws ApiError INVALID_ANSWER         – neither optionId nor answerText provided
   */
  async submitAnswer(data: {
    sessionId: string;
    participantId: string;
    questionId: string;
    optionId?: string;
    answerText?: string;
  }): Promise<void> {
    const { sessionId, participantId, questionId, optionId, answerText } = data;

    const activeQuestion = await this.stateRepo.getActiveQuestion(sessionId);
    if (!activeQuestion || activeQuestion.activeQuestionId !== questionId) {
      throw new ApiError(statusCode.badRequest, ERROR_CODES.NO_ACTIVE_QUESTION);
    }

    if (Date.now() > activeQuestion.questionEndsAt) {
      throw new ApiError(
        statusCode.badRequest,
        ERROR_CODES.QUESTION_TIMER_EXPIRED
      );
    }

    let value: string;
    if (answerText !== undefined && answerText !== null) {
      value = `text:${answerText}`;
    } else if (optionId) {
      value = optionId;
    } else {
      throw new ApiError(statusCode.badRequest, ERROR_CODES.INVALID_ANSWER);
    }

    // Overwrite in Redis (no evaluation, no DB hit — evaluation runs after timer via BullMQ)
    await this.stateRepo.updateAnswer(
      sessionId,
      questionId,
      participantId,
      value
    );
  }

  // ─── Question Flow ────────────────────────────────────────────────────────────

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

    await this.stateRepo.setActiveQuestion(
      sessionId,
      question.id,
      nextIndex,
      endsAt
    );

    await this.repo.updateSessionStatus(sessionId, {
      currentQuestionIndex: nextIndex + 1,
    });

    await this.sessionQueue.scheduleQuestionEvaluation(
      sessionId,
      question.id,
      delayMs
    );

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

  // ─── Evaluation (Called by BullMQ Worker) ─────────────────────────────────────

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
    const rawAnswers = await this.stateRepo.getAllAnswers(
      sessionId,
      questionId
    );

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
        answerText = value.slice(5);
        isCorrect = correctOptions.some(
          o => o.optionText.toLowerCase() === answerText!.toLowerCase()
        );
      } else {
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
        this.stateRepo.incrementScore(sessionId, participantId, points)
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
    const leaderboardRaw = await this.stateRepo.getLeaderboard(sessionId);

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
    await this.stateRepo.clearQuestionAnswers(sessionId, questionId);

    // 8. Check if this was the last question
    const session = await this.repo.findSessionWithQuestions(sessionId);
    const isLastQuestion =
      !!session &&
      session.currentQuestionIndex >= session.quiz.questions.length;

    if (isLastQuestion && session) {
      await this.repo.updateSessionStatus(sessionId, {
        status: SessionStatus.ENDED,
        endedAt: new Date(),
      });
      await this.stateRepo.setSessionEnded(sessionId);

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
