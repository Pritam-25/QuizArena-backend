import type { NextFunction, Request, Response } from 'express';
import { ApiError, ERROR_CODES } from '@shared/utils/errors/index.js';
import { statusCode } from '@shared/utils/http/statusCodes.js';
import { AUTH_COOKIE_NAME } from '@modules/auth/auth.constants.js';
import { extractToken, verifyToken } from '@shared/utils/auth/index.js';

export const authMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const token = extractToken({
    cookieToken: req.cookies?.[AUTH_COOKIE_NAME],
    authHeader: req.headers.authorization,
  });

  if (!token) {
    return next();
  }

  const decoded = verifyToken(token);

  req.user = { id: decoded.userId };

  return next();
};

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    throw new ApiError(statusCode.unauthorized, ERROR_CODES.UNAUTHORIZED);
  }

  return next();
};
