import type { Request, Response } from 'express';
import { statusCode, successResponse } from '@shared/utils/http/index.js';
import { env } from '@config/env.js';
import type { LoginDto, RegisterDto } from './auth.schema.js';
import { AuthService } from './auth.service.js';
import { AUTH_COOKIE_MAX_AGE_MS, AUTH_COOKIE_NAME } from './auth.constants.js';

export class AuthController {
  /**
   * Creates controller instance for auth HTTP handlers.
   * @param service - Auth service instance
   */
  constructor(private service: AuthService) {}

  /**
   * Sets the authentication cookie in the response.
   * @param res - Express response
   * @param token - Signed JWT token
   */
  private setAuthCookie(res: Response, token: string) {
    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: AUTH_COOKIE_MAX_AGE_MS,
      path: '/',
    });
  }

  /**
   * Registers a user and issues authentication cookie.
   * @param req - Express request
   * @param res - Express response
   */
  async register(req: Request, res: Response) {
    const payload = req.body as RegisterDto;
    const authResult = await this.service.register(payload);

    this.setAuthCookie(res, authResult.token);

    return res.status(statusCode.created).json(
      successResponse('Registration successful', {
        user: authResult.user,
      })
    );
  }

  /**
   * Logs in a user and issues authentication cookie.
   * @param req - Express request
   * @param res - Express response
   */
  async login(req: Request, res: Response) {
    const payload = req.body as LoginDto;
    const authResult = await this.service.login(payload);

    this.setAuthCookie(res, authResult.token);

    return res.status(statusCode.success).json(
      successResponse('Login successful', {
        user: authResult.user,
      })
    );
  }
}
