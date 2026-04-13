import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { SessionStatus } from '../../src/generated/prisma/enums.js';
import { prisma } from '../../src/infrastructure/database/prismaClient.js';
import { SessionRepository } from '../../src/modules/session/session.repository.js';

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

describeDb('SessionRepository integration', () => {
  const repo = new SessionRepository();

  it('creates session and finds by join code', async () => {
    const { host, quiz } = await createHostAndQuiz();
    const joinCode = randomUUID();

    const created = await repo.createSession({
      quizId: quiz.id,
      hostId: host.id,
      joinCode,
    });

    const found = await repo.findSessionByJoinCode(joinCode);

    expect(created.joinCode).toBe(joinCode);
    expect(found?.id).toBe(created.id);
    expect(found?.quizId).toBe(quiz.id);
  });

  it('adds participant and enforces unique nickname per session', async () => {
    const { host, quiz } = await createHostAndQuiz();
    const session = await repo.createSession({
      quizId: quiz.id,
      hostId: host.id,
      joinCode: randomUUID(),
    });

    const participant = await repo.addParticipant(session.id, 'player-one');

    expect(participant.nickname).toBe('player-one');
    await expect(
      repo.addParticipant(session.id, 'player-one')
    ).rejects.toMatchObject({
      code: 'P2002',
    });
  });

  it('updates session status to LIVE', async () => {
    const { host, quiz } = await createHostAndQuiz();
    const session = await repo.createSession({
      quizId: quiz.id,
      hostId: host.id,
      joinCode: randomUUID(),
    });

    const startedAt = new Date();
    const updated = await repo.updateSessionStatus(session.id, {
      status: SessionStatus.LIVE,
      startedAt,
      currentQuestionIndex: 0,
    });

    expect(updated.status).toBe(SessionStatus.LIVE);
    expect(updated.currentQuestionIndex).toBe(0);
    expect(updated.startedAt).not.toBeNull();
  });
});
