import type { ErrorCode } from "./errorCodes.js";

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  USER_ALREADY_EXISTS: "User already exists",
  INVALID_CREDENTIALS: "Invalid email or password",
  QUIZ_NOT_FOUND: "Quiz not found",
  INTERNAL_ERROR: "Something went wrong",
};
