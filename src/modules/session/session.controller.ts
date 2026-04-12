import type { Request, Response } from 'express';
import { statusCode, successResponse } from '@shared/utils/http/index.js';
import type { SessionService } from './session.service.js';
import type { CreateSessionDto, JoinSessionDto } from './session.dto.js';

export class SessionController {
  /**
   * Creates controller instance for session HTTP handlers.
   * @param service - Session service instance
   */
  constructor(private service: SessionService) {}

  /**
   * Creates a new session.
   * @param req - Express request
   * @param res - Express response
   */
  async createSession(req: Request, res: Response) {
    const payload = req.body as CreateSessionDto;
    const session = await this.service.createSession(payload);

    return res
      .status(statusCode.created)
      .json(successResponse('Session created', session));
  }

  /**
   * Fetches a session by id.
   * @param req - Express request
   * @param res - Express response
   */
  async getSessionById(req: Request, res: Response) {
    const sessionId = req.params.sessionId as string;
    const session = await this.service.findSessionById(sessionId);

    return res
      .status(statusCode.success)
      .json(successResponse('Session fetched successfully', session));
  }

  /**
   * Adds a participant to a waiting session.
   * @param req - Express request
   * @param res - Express response
   */
  async joinSession(req: Request, res: Response) {
    const payload = req.body as JoinSessionDto;
    const result = await this.service.joinSession(payload);

    return res
      .status(statusCode.created)
      .json(successResponse('Joined session successfully', result));
  }

  /**
   * Starts a session by id.
   * @param req - Express request
   * @param res - Express response
   */
  async startSession(req: Request, res: Response) {
    const sessionId = req.params.sessionId as string;
    const session = await this.service.startSession(sessionId);

    return res
      .status(statusCode.success)
      .json(successResponse('Session started', session));
  }
}
