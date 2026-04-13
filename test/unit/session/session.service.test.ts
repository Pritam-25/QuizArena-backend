import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionStatus } from '../../../src/generated/prisma/enums.js';
import { SessionService } from '../../../src/modules/session/session.service.js';
import type { SessionRepository } from '../../../src/modules/session/session.repository.js';
import { ERROR_CODES } from '../../../src/shared/utils/errors/errorCodes.js';
import { statusCode } from '../../../src/shared/utils/http/statusCodes.js';
import * as errorUtils from '../../../src/shared/utils/errors/index.js';
import * as sessionState from '../../../src/infrastructure/session.state.js';

vi.mock('@infrastructure/session.state.js', () => ({
  createSessionState: vi.fn(),
  addPlayer: vi.fn(),
}));

type RepoMock = {
  createSession: ReturnType<typeof vi.fn>;
  findSessionByJoinCode: ReturnType<typeof vi.fn>;
  findSessionById: ReturnType<typeof vi.fn>;
  addParticipant: ReturnType<typeof vi.fn>;
  updateSessionStatus: ReturnType<typeof vi.fn>;
};

function buildRepoMock(): RepoMock {
  return {
    createSession: vi.fn(),
    findSessionByJoinCode: vi.fn(),
    findSessionById: vi.fn(),
    addParticipant: vi.fn(),
    updateSessionStatus: vi.fn(),
  };
}

describe('SessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createSession persists session and returns prefixed join link', async () => {
    const repo = buildRepoMock();
    const service = new SessionService(repo as unknown as SessionRepository);

    repo.createSession.mockResolvedValue({
      id: 'session-1',
      quizId: 'quiz-1',
      hostId: 'host-1',
      joinCode: '123e4567-e89b-12d3-a456-426614174000',
      status: SessionStatus.WAITING,
      currentQuestionIndex: 0,
      startedAt: null,
      endedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await service.createSession({
      quizId: 'quiz-1',
      hostId: 'host-1',
    });

    expect(repo.createSession).toHaveBeenCalledWith({
      quizId: 'quiz-1',
      hostId: 'host-1',
      joinCode: expect.any(String),
    });

    expect(result.joinCode).toBe(
      'quizArena.com/123e4567-e89b-12d3-a456-426614174000'
    );
    expect(sessionState.createSessionState).toHaveBeenCalledWith('session-1');
  });

  it('joinSession returns SESSION_NOT_FOUND when session does not exist', async () => {
    const repo = buildRepoMock();
    const service = new SessionService(repo as unknown as SessionRepository);
    const joinCode = '123e4567-e89b-12d3-a456-426614174000';

    repo.findSessionByJoinCode.mockResolvedValue(null);

    await expect(
      service.joinSession({
        joinCode: `https://quizArena.com/${joinCode}`,
        nickname: 'player-one',
      })
    ).rejects.toMatchObject({
      statusCode: statusCode.notFound,
      errorCode: ERROR_CODES.SESSION_NOT_FOUND,
    });

    expect(repo.findSessionByJoinCode).toHaveBeenCalledWith(joinCode);
  });

  it('joinSession returns SESSION_NOT_JOINABLE when session status is not WAITING', async () => {
    const repo = buildRepoMock();
    const service = new SessionService(repo as unknown as SessionRepository);

    repo.findSessionByJoinCode.mockResolvedValue({
      id: 'session-1',
      status: SessionStatus.LIVE,
    });

    await expect(
      service.joinSession({
        joinCode: '123e4567-e89b-12d3-a456-426614174000',
        nickname: 'player-one',
      })
    ).rejects.toMatchObject({
      statusCode: statusCode.badRequest,
      errorCode: ERROR_CODES.SESSION_NOT_JOINABLE,
    });
  });

  it('joinSession returns PARTICIPANT_NICKNAME_TAKEN on unique violation', async () => {
    const repo = buildRepoMock();
    const service = new SessionService(repo as unknown as SessionRepository);

    repo.findSessionByJoinCode.mockResolvedValue({
      id: 'session-1',
      status: SessionStatus.WAITING,
    });

    const dbError = new Error('unique');
    repo.addParticipant.mockRejectedValue(dbError);

    vi.spyOn(errorUtils, 'isUniqueConstraintError').mockReturnValue(true);

    await expect(
      service.joinSession({
        joinCode: '123e4567-e89b-12d3-a456-426614174000',
        nickname: 'player-one',
      })
    ).rejects.toMatchObject({
      statusCode: statusCode.conflict,
      errorCode: ERROR_CODES.PARTICIPANT_NICKNAME_TAKEN,
    });
  });

  it('joinSession returns participant payload on success', async () => {
    const repo = buildRepoMock();
    const service = new SessionService(repo as unknown as SessionRepository);

    const participant = {
      id: 'participant-1',
      sessionId: 'session-1',
      nickname: 'player-one',
      score: 0,
      joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    repo.findSessionByJoinCode.mockResolvedValue({
      id: 'session-1',
      status: SessionStatus.WAITING,
    });
    repo.addParticipant.mockResolvedValue(participant);

    const result = await service.joinSession({
      joinCode: '123e4567-e89b-12d3-a456-426614174000',
      nickname: 'player-one',
    });

    expect(result).toEqual({
      sessionId: 'session-1',
      participant,
    });
    expect(sessionState.addPlayer).toHaveBeenCalledWith(
      'session-1',
      'participant-1'
    );
  });

  it('startSession returns SESSION_NOT_FOUND when session is missing', async () => {
    const repo = buildRepoMock();
    const service = new SessionService(repo as unknown as SessionRepository);

    repo.findSessionById.mockResolvedValue(null);

    await expect(service.startSession('session-1')).rejects.toMatchObject({
      statusCode: statusCode.notFound,
      errorCode: ERROR_CODES.SESSION_NOT_FOUND,
    });
  });

  it('startSession returns SESSION_NOT_STARTABLE when session status is not WAITING', async () => {
    const repo = buildRepoMock();
    const service = new SessionService(repo as unknown as SessionRepository);

    repo.findSessionById.mockResolvedValue({
      id: 'session-1',
      status: SessionStatus.LIVE,
    });

    await expect(service.startSession('session-1')).rejects.toMatchObject({
      statusCode: statusCode.badRequest,
      errorCode: ERROR_CODES.SESSION_NOT_STARTABLE,
    });
  });

  it('startSession transitions to LIVE and resets question index', async () => {
    const repo = buildRepoMock();
    const service = new SessionService(repo as unknown as SessionRepository);

    repo.findSessionById.mockResolvedValue({
      id: 'session-1',
      status: SessionStatus.WAITING,
    });
    repo.updateSessionStatus.mockResolvedValue({
      id: 'session-1',
      status: SessionStatus.LIVE,
      currentQuestionIndex: 0,
    });

    const result = await service.startSession('session-1');

    expect(repo.updateSessionStatus).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({
        status: SessionStatus.LIVE,
        currentQuestionIndex: 0,
        startedAt: expect.any(Date),
      })
    );
    expect(result).toEqual({
      id: 'session-1',
      status: SessionStatus.LIVE,
      currentQuestionIndex: 0,
    });
  });
});
