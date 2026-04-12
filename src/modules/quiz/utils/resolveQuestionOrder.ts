import { ApiError, ERROR_CODES } from '@shared/utils/errors/index.js';
import { statusCode } from '@shared/utils/http/statusCodes.js';
import { getMiddleString } from './fractionalOrder.js';

type LastQuestionOrder = {
  order: string;
};

type ResolveQuestionOrderParams = {
  quizId: string;
  prevOrder?: string;
  nextOrder?: string;
  getLastQuestionOrder: (quizId: string) => Promise<LastQuestionOrder | null>;
};

export async function resolveQuestionOrder({
  quizId,
  prevOrder,
  nextOrder,
  getLastQuestionOrder,
}: ResolveQuestionOrderParams): Promise<string> {
  if (prevOrder && nextOrder) {
    try {
      return getMiddleString(prevOrder, nextOrder);
    } catch {
      throw new ApiError(statusCode.badRequest, ERROR_CODES.INVALID_INPUT);
    }
  }

  if (prevOrder && !nextOrder) {
    return `${prevOrder}m`;
  }

  if (!prevOrder && nextOrder) {
    try {
      return getMiddleString('a', nextOrder);
    } catch {
      throw new ApiError(statusCode.badRequest, ERROR_CODES.INVALID_INPUT);
    }
  }

  const lastQuestion = await getLastQuestionOrder(quizId);
  return lastQuestion ? `${lastQuestion.order}m` : 'm';
}
