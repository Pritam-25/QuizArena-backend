import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import errorHandlerMiddleware from '../../src/shared/middlewares/errorHandler.js';
import authRoutes from '../../src/modules/auth/auth.routes.js';

const authControllerMock = vi.hoisted(() => ({
  register: vi.fn(),
  login: vi.fn(),
}));

vi.mock('@modules/auth/auth.factory.js', () => ({
  createAuthModule: () => ({
    controller: authControllerMock,
    service: {},
    repo: {},
  }),
}));

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  app.use(errorHandlerMiddleware);
  return app;
}

describe('Auth API routes', () => {
  const app = buildTestApp();

  beforeEach(() => {
    vi.clearAllMocks();

    authControllerMock.register.mockImplementation((_req, res) =>
      res
        .status(201)
        .json({ success: true, message: 'Registration successful' })
    );
    authControllerMock.login.mockImplementation((_req, res) =>
      res.status(200).json({ success: true, message: 'Login successful' })
    );
  });

  it('POST /api/v1/auth/register validates request body', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      email: 'invalid-email',
    });

    expect(response.status).toBe(400);
    expect(authControllerMock.register).not.toHaveBeenCalled();
  });

  it('POST /api/v1/auth/register calls controller for valid payload', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      username: 'pritam',
      email: 'pritam@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(201);
    expect(authControllerMock.register).toHaveBeenCalledOnce();
  });

  it('POST /api/v1/auth/login validates request body', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'pritam@example.com',
    });

    expect(response.status).toBe(400);
    expect(authControllerMock.login).not.toHaveBeenCalled();
  });

  it('POST /api/v1/auth/login calls controller for valid payload', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'pritam@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(authControllerMock.login).toHaveBeenCalledOnce();
  });
});
