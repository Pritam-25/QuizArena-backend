import type { Request, Response } from 'express';
import { statusCode, successResponse } from '@shared/utils/http/index.js';
import { env } from '@config/env.js';
import type { LoginDto, RegisterDto } from './auth.schema.js';
import { AuthService } from './auth.service.js';
import { AUTH_COOKIE_MAX_AGE_MS, AUTH_COOKIE_NAME } from './auth.constants.js';

export class AuthController {
  constructor(private service: AuthService) {}

  private setAuthCookie(res: Response, token: string) {
    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: AUTH_COOKIE_MAX_AGE_MS,
      path: '/',
    });
  }

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
