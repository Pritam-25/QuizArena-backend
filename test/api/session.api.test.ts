import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../../src/config/env.js';
import errorHandlerMiddleware from '../../src/shared/middlewares/errorHandler.js';
import sessionRoutes from '../../src/modules/session/session.routes.js';

const sessionControllerMock = vi.hoisted(() => ({
  createSession: vi.fn(),
  getSessionById: vi.fn(),
  joinSession: vi.fn(),
  startSession: vi.fn(),
}));

vi.mock('@modules/session/session.factory.js', () => ({
  createSessionModule: () => ({
    controller: sessionControllerMock,
    service: {},
    repo: {},
  }),
}));

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/sessions', sessionRoutes);
  app.use(errorHandlerMiddleware);
  return app;
}

function buildAuthToken() {
  return jwt.sign({ userId: 'user-1' }, env.JWT_SECRET, { expiresIn: '1h' });
}

describe('Session API routes', () => {
  const app = buildTestApp();

  beforeEach(() => {
    vi.clearAllMocks();

    sessionControllerMock.createSession.mockImplementation((_req, res) =>
      res.status(201).json({ success: true, message: 'Session created' })
    );
    sessionControllerMock.getSessionById.mockImplementation((_req, res) =>
      res.status(200).json({ success: true, message: 'Session fetched' })
    );
    sessionControllerMock.joinSession.mockImplementation((_req, res) =>
      res.status(201).json({ success: true, message: 'Joined session' })
    );
    sessionControllerMock.startSession.mockImplementation((_req, res) =>
      res.status(200).json({ success: true, message: 'Session started' })
    );
  });

  it('POST /api/v1/sessions requires authentication', async () => {
    const response = await request(app).post('/api/v1/sessions').send({
      quizId: '123e4567-e89b-12d3-a456-426614174000',
    });

    expect(response.status).toBe(401);
    expect(sessionControllerMock.createSession).not.toHaveBeenCalled();
  });

  it('POST /api/v1/sessions validates body before controller', async () => {
    const token = buildAuthToken();
    const response = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
    expect(sessionControllerMock.createSession).not.toHaveBeenCalled();
  });

  it('POST /api/v1/sessions calls controller with valid auth and body', async () => {
    const token = buildAuthToken();
    const response = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        quizId: '123e4567-e89b-12d3-a456-426614174000',
      });

    expect(response.status).toBe(201);
    expect(sessionControllerMock.createSession).toHaveBeenCalledOnce();
  });

  it('POST /api/v1/sessions/join validates body before controller', async () => {
    const response = await request(app).post('/api/v1/sessions/join').send({
      joinCode: 'invalid',
    });

    expect(response.status).toBe(400);
    expect(sessionControllerMock.joinSession).not.toHaveBeenCalled();
  });

  it('POST /api/v1/sessions/join calls controller with valid body', async () => {
    const response = await request(app).post('/api/v1/sessions/join').send({
      joinCode: '123e4567-e89b-12d3-a456-426614174000',
      nickname: 'player-one',
    });

    expect(response.status).toBe(201);
    expect(sessionControllerMock.joinSession).toHaveBeenCalledOnce();
  });

  it('POST /api/v1/sessions/:sessionId/start calls controller', async () => {
    const response = await request(app).post(
      '/api/v1/sessions/session-1/start'
    );

    expect(response.status).toBe(200);
    expect(sessionControllerMock.startSession).toHaveBeenCalledOnce();
  });
});
