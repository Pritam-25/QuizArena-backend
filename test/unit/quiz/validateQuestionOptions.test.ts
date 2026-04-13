import { describe, expect, it } from 'vitest';
import { QuestionType } from '../../../src/generated/prisma/enums.js';
import { validateQuestionOptions } from '../../../src/modules/quiz/utils/validateQuestionOptions.js';
import { ERROR_CODES } from '../../../src/shared/utils/errors/errorCodes.js';
import { statusCode } from '../../../src/shared/utils/http/statusCodes.js';

function expectValidationError(fn: () => void, errorCode: string) {
  try {
    fn();
    throw new Error('Expected validation to throw');
  } catch (error) {
    expect(error).toMatchObject({
      statusCode: statusCode.badRequest,
      errorCode,
    });
  }
}

describe('validateQuestionOptions', () => {
  it('throws DUPLICATE_OPTIONS for case-insensitive duplicate text', () => {
    expectValidationError(
      () =>
        validateQuestionOptions(QuestionType.MCQ, [
          { optionText: ' Paris ', isCorrect: true },
          { optionText: 'paris', isCorrect: false },
        ]),
      ERROR_CODES.DUPLICATE_OPTIONS
    );
  });

  it('accepts valid MCQ options', () => {
    expect(() =>
      validateQuestionOptions(QuestionType.MCQ, [
        { optionText: 'A', isCorrect: true },
        { optionText: 'B', isCorrect: false },
      ])
    ).not.toThrow();
  });

  it('throws INVALID_OPTIONS for MCQ with multiple correct answers', () => {
    expectValidationError(
      () =>
        validateQuestionOptions(QuestionType.MCQ, [
          { optionText: 'A', isCorrect: true },
          { optionText: 'B', isCorrect: true },
        ]),
      ERROR_CODES.INVALID_OPTIONS
    );
  });

  it('throws INVALID_OPTIONS for MULTI_SELECT with no correct answer', () => {
    expectValidationError(
      () =>
        validateQuestionOptions(QuestionType.MULTI_SELECT, [
          { optionText: 'A', isCorrect: false },
          { optionText: 'B', isCorrect: false },
        ]),
      ERROR_CODES.INVALID_OPTIONS
    );
  });

  it('throws INVALID_OPTIONS for TRUE_FALSE with invalid option shape', () => {
    expectValidationError(
      () =>
        validateQuestionOptions(QuestionType.TRUE_FALSE, [
          { optionText: 'True', isCorrect: true },
        ]),
      ERROR_CODES.INVALID_OPTIONS
    );
  });

  it('accepts empty options for FILL_IN_THE_BLANK', () => {
    expect(() =>
      validateQuestionOptions(QuestionType.FILL_IN_THE_BLANK, [])
    ).not.toThrow();
  });

  it('throws NO_OPTIONS_ALLOWED for FILL_IN_THE_BLANK with options', () => {
    expectValidationError(
      () =>
        validateQuestionOptions(QuestionType.FILL_IN_THE_BLANK, [
          { optionText: 'Answer', isCorrect: true },
        ]),
      ERROR_CODES.NO_OPTIONS_ALLOWED
    );
  });
});
