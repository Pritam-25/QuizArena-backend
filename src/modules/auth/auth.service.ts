import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ApiError } from '@shared/utils/errors/apiError.js';
import { statusCode } from '@shared/utils/http/statusCodes.js';
import { ERROR_CODES } from '@shared/utils/errors/errorCodes.js';
import { env } from '@config/env.js';
import { Prisma } from '@generated/prisma/client.js';
import type { LoginDto, RegisterDto } from './auth.schema.js';
import { AuthRepository } from './auth.repository.js';
import { toAuthResponseDto } from './auth.mapper.js';
import type { AuthResponseDto } from './auth.dto.js';

export class AuthService {
  constructor(private repo: AuthRepository) {}

  private generateToken(userId: string) {
    return jwt.sign({ userId }, env.JWT_SECRET, {
      expiresIn: '7d',
    });
  }

  async register(data: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.repo.findUserByEmail(data.email);
    if (existingUser) {
      throw new ApiError(statusCode.conflict, ERROR_CODES.USER_ALREADY_EXISTS);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    let user;

    try {
      user = await this.repo.createUser({
        username: data.username,
        email: data.email,
        password: hashedPassword,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ApiError(
          statusCode.conflict,
          ERROR_CODES.USER_ALREADY_EXISTS,
          'Email already in use'
        );
      }

      throw error;
    }

    const token = this.generateToken(user.id);

    return toAuthResponseDto(user, token);
  }

  async login(data: LoginDto): Promise<AuthResponseDto> {
    const user = await this.repo.findUserByEmail(data.email);

    if (!user || !user.password) {
      throw new ApiError(
        statusCode.unauthorized,
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(
        statusCode.unauthorized,
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    const token = this.generateToken(user.id);

    return toAuthResponseDto(user, token);
  }
}
