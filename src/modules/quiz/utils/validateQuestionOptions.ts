import { QuestionType } from '@generated/prisma/enums.js';
import { ApiError, ERROR_CODES } from '@shared/utils/errors/index.js';
import { statusCode } from '@shared/utils/http/statusCodes.js';
import type { AddOptionsDto } from '../quiz.schema.js';

export function validateQuestionOptions(
  questionType: QuestionType,
  options: AddOptionsDto[]
) {
  const normalizedTexts = options.map(opt =>
    opt.optionText.trim().toLowerCase()
  );
  const uniqueOptionTextCount = new Set(normalizedTexts).size;

  if (uniqueOptionTextCount !== normalizedTexts.length) {
    throw new ApiError(statusCode.badRequest, ERROR_CODES.DUPLICATE_OPTIONS);
  }

  const correctOptionsCount = options.filter(opt => opt.isCorrect).length;

  switch (questionType) {
    case QuestionType.MCQ:
      if (correctOptionsCount !== 1) {
        throw new ApiError(
          statusCode.badRequest,
          ERROR_CODES.INVALID_OPTIONS,
          'MCQ questions must have exactly one correct option'
        );
      }
      break;

    case QuestionType.MULTI_SELECT:
      if (correctOptionsCount < 1) {
        throw new ApiError(
          statusCode.badRequest,
          ERROR_CODES.INVALID_OPTIONS,
          'Multi-select questions must have at least one correct option'
        );
      }
      break;

    case QuestionType.TRUE_FALSE:
      if (options.length !== 2 || correctOptionsCount !== 1) {
        throw new ApiError(
          statusCode.badRequest,
          ERROR_CODES.INVALID_OPTIONS,
          'True/False questions must have exactly two options with one correct'
        );
      }
      break;

    case QuestionType.FILL_IN_THE_BLANK:
      if (options.length > 0 || correctOptionsCount > 0) {
        throw new ApiError(
          statusCode.badRequest,
          ERROR_CODES.NO_OPTIONS_ALLOWED,
          'Options are not allowed for fill-in-the-blank questions'
        );
      }
      break;

    default:
      throw new ApiError(
        statusCode.badRequest,
        ERROR_CODES.INVALID_OPTIONS,
        'Invalid question type'
      );
  }
}
