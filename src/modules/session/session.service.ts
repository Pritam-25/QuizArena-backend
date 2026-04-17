import { SessionStatus } from '@generated/prisma/enums.js';
import {
  addPlayer,
  createSessionState,
} from '@infrastructure/session.state.js';
import logger from '@infrastructure/logger/logger.js';
import { ApiError, ERROR_CODES } from '@shared/utils/errors/index.js';
import { statusCode } from '@shared/utils/http/statusCodes.js';
import type { SessionRepository } from './session.repository.js';
import type {
  CreateSessionDto,
  JoinSessionDto,
  JoinSessionResponseDto,
  SessionResponseDto,
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

    return updated;
  }
}
