import type { ZodType } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { errorResponse } from '@shared/utils/http/apiResponses.js';
import { statusCode } from '@shared/utils/http/statusCodes.js';
import { ERROR_CODES } from '@shared/utils/errors/index.js';
import { ApiError } from '@shared/utils/errors/apiError.js';
import logger from '@infrastructure/logger/logger.js';

export const validateSchema =
  (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
    if (!req.body) {
      const apiErr = new ApiError(
        statusCode.badRequest,
        ERROR_CODES.REQUIRE_REQUEST_BODY
      );

      res.status(statusCode.badRequest).json(errorResponse(apiErr));
      return;
    }

    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors: Record<string, string> = {};
      const sanitizedPath = req.baseUrl + req.path;

      result.error.issues.forEach(issue => {
        const field = issue.path.length ? issue.path.join('.') : 'body';
        if (!errors[field]) {
          errors[field] = issue.message;
        }
      });

      logger.error(
        {
          message: 'Validation Failed',
          statusCode: statusCode.badRequest,
          requestId: (req as any).requestId,
          path: sanitizedPath,
          method: req.method,
          errors,
        },
        'Validation Failed'
      );

      const apiErr = new ApiError(
        statusCode.badRequest,
        ERROR_CODES.INVALID_INPUT,
        errors
      );

      return res.status(statusCode.badRequest).json(errorResponse(apiErr));
    }

    req.body = result.data;

    return next();
  };
