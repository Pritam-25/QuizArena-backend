import type { Request } from 'express';
import { ApiError, ERROR_CODES } from '@shared/utils/errors/index.js';
import { statusCode } from '@shared/utils/http/statusCodes.js';

export const getRequiredUserId = (req: Request) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(statusCode.unauthorized, ERROR_CODES.UNAUTHORIZED);
  }

  return userId;
};
