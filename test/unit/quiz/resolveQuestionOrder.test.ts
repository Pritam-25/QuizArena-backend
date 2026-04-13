import { describe, expect, it, vi } from 'vitest';
import { resolveQuestionOrder } from '../../../src/modules/quiz/utils/resolveQuestionOrder.js';
import { ERROR_CODES } from '../../../src/shared/utils/errors/errorCodes.js';
import { statusCode } from '../../../src/shared/utils/http/statusCodes.js';

describe('resolveQuestionOrder', () => {
  it('returns a key between prevOrder and nextOrder', async () => {
    const result = await resolveQuestionOrder({
      quizId: 'quiz-1',
      prevOrder: 'a',
      nextOrder: 'z',
      getLastQuestionOrder: vi.fn().mockResolvedValue(null),
    });

    expect(result > 'a').toBe(true);
    expect(result < 'z').toBe(true);
  });

  it('appends at end when only prevOrder is provided', async () => {
    const result = await resolveQuestionOrder({
      quizId: 'quiz-1',
      prevOrder: 'am',
      getLastQuestionOrder: vi.fn().mockResolvedValue(null),
    });

    expect(result).toBe('amm');
  });

  it('inserts near start when only nextOrder is provided', async () => {
    const result = await resolveQuestionOrder({
      quizId: 'quiz-1',
      nextOrder: 'c',
      getLastQuestionOrder: vi.fn().mockResolvedValue(null),
    });

    expect(result > 'a').toBe(true);
    expect(result < 'c').toBe(true);
  });

  it('uses last question order when anchors are not provided', async () => {
    const getLastQuestionOrder = vi
      .fn()
      .mockResolvedValue({ order: 'k' as const });

    const result = await resolveQuestionOrder({
      quizId: 'quiz-1',
      getLastQuestionOrder,
    });

    expect(getLastQuestionOrder).toHaveBeenCalledWith('quiz-1');
    expect(result).toBe('km');
  });

  it('returns default order m for first question in empty quiz', async () => {
    const result = await resolveQuestionOrder({
      quizId: 'quiz-1',
      getLastQuestionOrder: vi.fn().mockResolvedValue(null),
    });

    expect(result).toBe('m');
  });

  it('throws INVALID_INPUT when anchors are invalid', async () => {
    await expect(
      resolveQuestionOrder({
        quizId: 'quiz-1',
        prevOrder: 'z',
        nextOrder: 'a',
        getLastQuestionOrder: vi.fn().mockResolvedValue(null),
      })
    ).rejects.toMatchObject({
      statusCode: statusCode.badRequest,
      errorCode: ERROR_CODES.INVALID_INPUT,
    });
  });
});
