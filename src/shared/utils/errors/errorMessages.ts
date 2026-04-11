import type { ErrorCode } from './errorCodes.js';

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  USER_ALREADY_EXISTS: 'User already exists',
  UNAUTHORIZED: 'Unauthorized',
  INVALID_TOKEN: 'Invalid token',
  INVALID_CREDENTIALS: 'Invalid email or password',
  INVALID_INPUT: 'Invalid input',
  REQUIRE_REQUEST_BODY: 'Request body is required',
  QUIZ_NOT_FOUND: 'Quiz not found',
  QUESTION_NOT_FOUND: 'Question not found',
  INVALID_OPTIONS: 'Invalid options provided',
  NO_OPTIONS_ALLOWED: 'Options are not allowed for this question type',
  INTERNAL_ERROR: 'Something went wrong',
};
