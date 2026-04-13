import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '@config/env.js';
import errorHandlerMiddleware from '@shared/middlewares/errorHandler.js';
import quizRoutes from '../../src/modules/quiz/quiz.routes.js';

const quizControllerMock = vi.hoisted(() => ({
  createQuiz: vi.fn(),
  getAllQuizzes: vi.fn(),
  getQuizById: vi.fn(),
  addQuestionToQuiz: vi.fn(),
  addOptionToQuestion: vi.fn(),
  reorderQuestion: vi.fn(),
}));

vi.mock('@modules/quiz/quiz.factory.js', () => ({
  createQuizModule: () => ({
    controller: quizControllerMock,
    service: {},
    repo: {},
  }),
}));

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/quizzes', quizRoutes);
  app.use(errorHandlerMiddleware);
  return app;
}

function buildAuthToken() {
  return jwt.sign({ userId: 'user-1' }, env.JWT_SECRET, {
    expiresIn: '1h',
  });
}

describe('Quiz API routes', () => {
  const app = buildTestApp();

  beforeEach(() => {
    vi.clearAllMocks();

    quizControllerMock.createQuiz.mockImplementation((_req, res) =>
      res.status(201).json({ success: true, message: 'Quiz created' })
    );
    quizControllerMock.getAllQuizzes.mockImplementation((_req, res) =>
      res.status(200).json({ success: true, message: 'Quizzes fetched' })
    );
    quizControllerMock.getQuizById.mockImplementation((_req, res) =>
      res.status(200).json({ success: true, message: 'Quiz fetched' })
    );
    quizControllerMock.addQuestionToQuiz.mockImplementation((_req, res) =>
      res.status(201).json({ success: true, message: 'Question added' })
    );
    quizControllerMock.addOptionToQuestion.mockImplementation((_req, res) =>
      res.status(201).json({ success: true, message: 'Options added' })
    );
    quizControllerMock.reorderQuestion.mockImplementation((_req, res) =>
      res.status(200).json({ success: true, message: 'Question reordered' })
    );
  });

  it('POST /api/v1/quizzes requires authentication', async () => {
    const response = await request(app).post('/api/v1/quizzes').send({
      title: 'Science Quiz',
    });

    expect(response.status).toBe(401);
    expect(quizControllerMock.createQuiz).not.toHaveBeenCalled();
  });

  it('POST /api/v1/quizzes validates body before controller', async () => {
    const token = buildAuthToken();

    const response = await request(app)
      .post('/api/v1/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Hi',
      });

    expect(response.status).toBe(400);
    expect(quizControllerMock.createQuiz).not.toHaveBeenCalled();
  });

  it('POST /api/v1/quizzes calls controller on valid request', async () => {
    const token = buildAuthToken();

    const response = await request(app)
      .post('/api/v1/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Science Quiz',
        description: 'General science',
      });

    expect(response.status).toBe(201);
    expect(quizControllerMock.createQuiz).toHaveBeenCalledOnce();
  });

  it('GET /api/v1/quizzes is public', async () => {
    const response = await request(app).get('/api/v1/quizzes');

    expect(response.status).toBe(200);
    expect(quizControllerMock.getAllQuizzes).toHaveBeenCalledOnce();
  });

  it('POST /api/v1/quizzes/:quizId/questions validates payload', async () => {
    const token = buildAuthToken();

    const response = await request(app)
      .post('/api/v1/quizzes/quiz-1/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'MCQ',
        points: 1,
      });

    expect(response.status).toBe(400);
    expect(quizControllerMock.addQuestionToQuiz).not.toHaveBeenCalled();
  });

  it('PATCH /api/v1/quizzes/:quizId/questions/:questionId/reorder validates anchors', async () => {
    const token = buildAuthToken();

    const response = await request(app)
      .patch('/api/v1/quizzes/quiz-1/questions/question-1/reorder')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
    expect(quizControllerMock.reorderQuestion).not.toHaveBeenCalled();
  });
});
