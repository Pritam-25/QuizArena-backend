import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { describeDb } from '../setup/test-db.js';
import { createApiAgent, createApiClient } from '../setup/test-server.js';

describeDb('Quiz to Session flow (e2e)', () => {
  it('registers user, creates quiz, opens session, and joins as participant', async () => {
    const agent = createApiAgent();
    const client = createApiClient();

    const registerResponse = await agent.post('/api/v1/auth/register').send({
      username: `host_${randomUUID()}`,
      email: `${randomUUID()}@example.com`,
      password: 'password123',
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.success).toBe(true);

    const quizResponse = await agent.post('/api/v1/quizzes').send({
      title: `E2E Quiz ${randomUUID()}`,
      description: 'full flow',
    });

    expect(quizResponse.status).toBe(201);
    const quizId = quizResponse.body.data.id as string;

    const questionResponse = await agent
      .post(`/api/v1/quizzes/${quizId}/questions`)
      .send({
        questionText: '2 + 2 = ?',
        type: 'MCQ',
        timeLimit: 30,
        points: 1,
      });

    expect(questionResponse.status).toBe(201);
    const questionId = questionResponse.body.data.id as string;

    const optionsResponse = await agent
      .post(`/api/v1/quizzes/questions/${questionId}/options`)
      .send([
        { optionText: '4', isCorrect: true },
        { optionText: '5', isCorrect: false },
      ]);

    expect(optionsResponse.status).toBe(201);

    const sessionResponse = await agent.post('/api/v1/sessions').send({
      quizId,
    });

    expect(sessionResponse.status).toBe(201);
    const sessionId = sessionResponse.body.data.id as string;
    const joinCode = sessionResponse.body.data.joinCode as string;

    const joinResponse = await client.post('/api/v1/sessions/join').send({
      joinCode,
      nickname: 'player-one',
    });

    expect(joinResponse.status).toBe(201);
    expect(joinResponse.body.data.sessionId).toBe(sessionId);

    const startResponse = await agent.post(
      `/api/v1/sessions/${sessionId}/start`
    );

    expect(startResponse.status).toBe(200);
    expect(startResponse.body.data.status).toBe('LIVE');
  }, 30000);
});
