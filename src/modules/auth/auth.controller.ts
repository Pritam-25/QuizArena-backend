import type { Request, Response } from 'express';
import { statusCode, successResponse } from '@shared/utils/http/index.js';
import type { LoginDto, RegisterDto } from './auth.schema.js';
import { AuthService } from './auth.service.js';

export class AuthController {
  constructor(private service: AuthService) {}

  async register(req: Request, res: Response) {
    const payload = req.body as RegisterDto;
    const authResult = await this.service.register(payload);

    return res
      .status(statusCode.created)
      .json(successResponse('Registration successful', authResult));
  }

  async login(req: Request, res: Response) {
    const payload = req.body as LoginDto;
    const authResult = await this.service.login(payload);

    return res
      .status(statusCode.success)
      .json(successResponse('Login successful', authResult));
  }
}
