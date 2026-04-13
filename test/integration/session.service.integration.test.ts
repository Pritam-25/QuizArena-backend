import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { SessionStatus } from '@generated/prisma/enums.js';
import { prisma } from '@infrastructure/database/prismaClient.js';
import { SessionRepository } from '@modules/session/session.repository.js';
import { SessionService } from '@modules/session/session.service.js';
import { ERROR_CODES } from '@shared/utils/errors/errorCodes.js';
import { statusCode } from '@shared/utils/http/statusCodes.js';

const describeDb =
  process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

async function createHostAndQuiz() {
  const host = await prisma.user.create({
    data: {
      username: `host_${randomUUID()}`,
      email: `${randomUUID()}@example.com`,
      password: 'password123',
      isGuest: false,
    },
  });

  const quiz = await prisma.quiz.create({
    data: {
      title: `Quiz ${randomUUID()}`,
      description: 'integration test quiz',
      createdBy: host.id,
    },
  });

  return { host, quiz };
}

describeDb('SessionService integration', () => {
  const repo = new SessionRepository();
  const service = new SessionService(repo);

  it('joinSession returns SESSION_NOT_FOUND for unknown join code', async () => {
    const unknownJoinCode = randomUUID();

    await expect(
      service.joinSession({
        joinCode: unknownJoinCode,
        nickname: 'player-one',
      })
    ).rejects.toMatchObject({
      statusCode: statusCode.notFound,
      errorCode: ERROR_CODES.SESSION_NOT_FOUND,
    });
  });

  it('joinSession returns SESSION_NOT_JOINABLE when session is LIVE', async () => {
    const { host, quiz } = await createHostAndQuiz();
    const joinCode = randomUUID();

    const session = await repo.createSession({
      quizId: quiz.id,
      hostId: host.id,
      joinCode,
      status: SessionStatus.LIVE,
    });

    await expect(
      service.joinSession({
        joinCode,
        nickname: 'player-one',
      })
    ).rejects.toMatchObject({
      statusCode: statusCode.badRequest,
      errorCode: ERROR_CODES.SESSION_NOT_JOINABLE,
    });

    const reloaded = await repo.findSessionById(session.id);
    expect(reloaded?.status).toBe(SessionStatus.LIVE);
  });

  it('joinSession maps duplicate nickname to PARTICIPANT_NICKNAME_TAKEN', async () => {
    const { host, quiz } = await createHostAndQuiz();
    const joinCode = randomUUID();

    const session = await repo.createSession({
      quizId: quiz.id,
      hostId: host.id,
      joinCode,
    });

    await repo.addParticipant(session.id, 'player-one');

    await expect(
      service.joinSession({
        joinCode,
        nickname: 'player-one',
      })
    ).rejects.toMatchObject({
      statusCode: statusCode.conflict,
      errorCode: ERROR_CODES.PARTICIPANT_NICKNAME_TAKEN,
    });
  });

  it('joinSession accepts full join link and adds participant', async () => {
    const { host, quiz } = await createHostAndQuiz();
    const joinCode = randomUUID();

    const session = await repo.createSession({
      quizId: quiz.id,
      hostId: host.id,
      joinCode,
    });

    const result = await service.joinSession({
      joinCode: `https://quizArena.com/${joinCode}`,
      nickname: 'player-two',
    });

    expect(result.sessionId).toBe(session.id);
    expect(result.participant.nickname).toBe('player-two');

    const participantCount = await prisma.participant.count({
      where: { sessionId: session.id },
    });
    expect(participantCount).toBe(1);
  });

  it('startSession returns SESSION_NOT_FOUND for unknown session id', async () => {
    await expect(service.startSession(randomUUID())).rejects.toMatchObject({
      statusCode: statusCode.notFound,
      errorCode: ERROR_CODES.SESSION_NOT_FOUND,
    });
  });

  it('startSession returns SESSION_NOT_STARTABLE when status is not WAITING', async () => {
    const { host, quiz } = await createHostAndQuiz();

    const session = await repo.createSession({
      quizId: quiz.id,
      hostId: host.id,
      joinCode: randomUUID(),
      status: SessionStatus.PAUSED,
    });

    await expect(service.startSession(session.id)).rejects.toMatchObject({
      statusCode: statusCode.badRequest,
      errorCode: ERROR_CODES.SESSION_NOT_STARTABLE,
    });
  });

  it('startSession transitions WAITING to LIVE and resets index', async () => {
    const { host, quiz } = await createHostAndQuiz();

    const session = await repo.createSession({
      quizId: quiz.id,
      hostId: host.id,
      joinCode: randomUUID(),
      currentQuestionIndex: 9,
    });

    const started = await service.startSession(session.id);

    expect(started.status).toBe(SessionStatus.LIVE);
    expect(started.currentQuestionIndex).toBe(0);
    expect(started.startedAt).toBeTruthy();

    const reloaded = await repo.findSessionById(session.id);
    expect(reloaded?.status).toBe(SessionStatus.LIVE);
    expect(reloaded?.currentQuestionIndex).toBe(0);
  });
});
