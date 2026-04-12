import { SessionStatus } from '@generated/prisma/enums.js';
import {
  ApiError,
  ERROR_CODES,
  isUniqueConstraintError,
} from '@shared/utils/errors/index.js';
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
    const session = await this.repo.createSession({ ...data, joinCode });

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

    let participant;

    try {
      participant = await this.repo.addParticipant(session.id, data.nickname);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ApiError(
          statusCode.conflict,
          ERROR_CODES.PARTICIPANT_NICKNAME_TAKEN
        );
      }

      throw error;
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
