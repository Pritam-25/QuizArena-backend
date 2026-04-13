import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import errorHandlerMiddleware from '../../src/shared/middlewares/errorHandler.js';
import userRoutes from '../../src/modules/user/user.routes.js';

const userControllerMock = vi.hoisted(() => ({
  createUser: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('@modules/user/user.factory.js', () => ({
  createUserModule: () => ({
    controller: userControllerMock,
    service: {},
    repo: {},
  }),
}));

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/users', userRoutes);
  app.use(errorHandlerMiddleware);
  return app;
}

describe('User API routes', () => {
  const app = buildTestApp();

  beforeEach(() => {
    vi.clearAllMocks();

    userControllerMock.createUser.mockImplementation((_req, res) =>
      res.status(201).json({ success: true, message: 'User created' })
    );
    userControllerMock.getUser.mockImplementation((_req, res) =>
      res.status(200).json({ success: true, message: 'User retrieved' })
    );
  });

  it('POST /api/v1/users validates payload type', async () => {
    const response = await request(app).post('/api/v1/users').send({
      username: 123,
    });

    expect(response.status).toBe(400);
    expect(userControllerMock.createUser).not.toHaveBeenCalled();
  });

  it('POST /api/v1/users calls controller for valid payload', async () => {
    const response = await request(app).post('/api/v1/users').send({
      username: 'guest-player',
    });

    expect(response.status).toBe(201);
    expect(userControllerMock.createUser).toHaveBeenCalledOnce();
  });

  it('GET /api/v1/users/:id calls controller', async () => {
    const response = await request(app).get('/api/v1/users/user-1');

    expect(response.status).toBe(200);
    expect(userControllerMock.getUser).toHaveBeenCalledOnce();
  });
});
