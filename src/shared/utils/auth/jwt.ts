import jwt from 'jsonwebtoken';
import { env } from '@config/env.js';

export type JwtPayload = {
  userId: string;
};

export class AuthTokenError extends Error {
  constructor() {
    super('INVALID_TOKEN');
    this.name = 'AuthTokenError';
  }
}

const isJwtPayload = (value: unknown): value is JwtPayload => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'userId' in value &&
    typeof value.userId === 'string'
  );
};

/**
 * Verifies a JWT and returns a validated auth payload.
 *
 * @param token - JWT token to verify.
 * @returns Decoded payload containing authenticated user id.
 * @throws AuthTokenError when token is invalid or payload shape is unexpected.
 */
export const verifyToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (!isJwtPayload(decoded)) {
      throw new AuthTokenError();
    }

    return decoded;
  } catch (error) {
    throw new AuthTokenError();
  }
};
