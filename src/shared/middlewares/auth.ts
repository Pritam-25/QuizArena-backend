import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '@shared/utils/errors/apiError.js';
import { statusCode } from '@shared/utils/http/statusCodes.js';
import { ERROR_CODES } from '@shared/utils/errors/errorCodes.js';

type JwtPayload = {
  userId: string;
};

export const authMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7).trim();
  const jwtSecret = process.env.JWT_SECRET;

  if (!token) {
    throw new ApiError(statusCode.unauthorized, ERROR_CODES.INVALID_TOKEN);
  }

  if (!jwtSecret) {
    throw new ApiError(statusCode.internalError, ERROR_CODES.INTERNAL_ERROR);
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      !('userId' in decoded) ||
      typeof decoded.userId !== 'string'
    ) {
      throw new ApiError(statusCode.unauthorized, ERROR_CODES.INVALID_TOKEN);
    }

    req.user = { id: decoded.userId };
    // Keep backward compatibility with existing handlers while migrating to req.user
    req.userId = decoded.userId;

    return next();
  } catch {
    throw new ApiError(statusCode.unauthorized, ERROR_CODES.INVALID_TOKEN);
  }
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
