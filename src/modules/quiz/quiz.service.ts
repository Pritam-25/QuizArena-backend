import {
  ApiError,
  ERROR_CODES,
  isUniqueConstraintError,
} from '@shared/utils/errors/index.js';
import { QuizRepository } from './quiz.repository.js';
import type {
  AddOptionsDto,
  AddQuestionInputDto,
  CreateQuizDto,
  ReorderQuestionDto,
} from './quiz.schema.js';
import type { QuizDetailsResponseDto } from './quiz.dto.js';
import { statusCode } from '@shared/utils/http/statusCodes.js';
import { validateQuestionOptions } from './utils/validateQuestionOptions.js';
import { resolveQuestionOrder } from './utils/resolveQuestionOrder.js';
import { toQuizDetailsResponseDto } from './quiz.mapper.js';

export class QuizService {
  /**
   * Creates service instance for quiz business logic.
   * @param repo - Quiz repository instance
   */
  constructor(private repo: QuizRepository) {}

  /**
   * Ensures a quiz exists and is owned by the authenticated user.
   * @param quizId - Quiz ID
   * @param userId - Authenticated user ID
   * @throws ApiError when quiz is missing or forbidden
   */
  private async assertQuizOwnership(quizId: string, userId: string) {
    const quiz = await this.repo.findQuizById(quizId);

    if (!quiz) {
      throw new ApiError(statusCode.notFound, ERROR_CODES.QUIZ_NOT_FOUND);
    }

    if (quiz.createdBy !== userId) {
      throw new ApiError(statusCode.forbidden, ERROR_CODES.FORBIDDEN);
    }
  }

  /**
   * Refreshes order anchors from latest quiz state to avoid stale-boundary retries.
   * @param quizId - Quiz ID
   * @param prevOrder - Current previous bound
   * @param nextOrder - Current next bound
   * @returns Updated bounds for the next resolve attempt
   */
  private async refreshRetryAnchors(
    quizId: string,
    prevOrder: string | undefined,
    nextOrder: string | undefined
  ) {
    if (prevOrder && nextOrder) {
      const nearestAfterPrev = await this.repo.getNearestQuestionOrderAfter(
        quizId,
        prevOrder,
        nextOrder
      );

      return {
        prevOrder,
        nextOrder: nearestAfterPrev?.order ?? nextOrder,
      };
    }

    if (prevOrder && !nextOrder) {
      const nearestAfterPrev = await this.repo.getNearestQuestionOrderAfter(
        quizId,
        prevOrder
      );

      return {
        prevOrder,
        nextOrder: nearestAfterPrev?.order,
      };
    }

    if (!prevOrder && nextOrder) {
      const nearestBeforeNext = await this.repo.getNearestQuestionOrderBefore(
        quizId,
        nextOrder
      );

      return {
        prevOrder: nearestBeforeNext?.order,
        nextOrder,
      };
    }

    return {
      prevOrder,
      nextOrder,
    };
  }

  /**
   * Resolves a fractional order key and retries once on unique-order race.
   * @param params - Quiz/order anchors and callback that applies the resolved key
   * @returns Callback result after successful order resolution
   */
  private async executeWithResolvedOrderRetry<T>(params: {
    quizId: string;
    prevOrder: string | undefined;
    nextOrder: string | undefined;
    execute: (order: string) => Promise<T>;
  }): Promise<T> {
    const { quizId, execute } = params;
    let { prevOrder, nextOrder } = params;
    const maxAttempts = 2;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        if (attempt > 0) {
          const refreshedAnchors = await this.refreshRetryAnchors(
            quizId,
            prevOrder,
            nextOrder
          );
          prevOrder = refreshedAnchors.prevOrder;
          nextOrder = refreshedAnchors.nextOrder;
        }

        const order = await resolveQuestionOrder({
          quizId,
          getLastQuestionOrder: targetQuizId =>
            this.repo.getLastQuestionOrder(targetQuizId),
          ...(prevOrder ? { prevOrder } : {}),
          ...(nextOrder ? { nextOrder } : {}),
        });

        return await execute(order);
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }
      }
    }

    throw new ApiError(
      statusCode.badRequest,
      ERROR_CODES.DUPLICATE_QUESTION_ORDER
    );
  }

  /**
   * Creates a quiz and links it to the creator.
   * @param data - Quiz payload with creator id
   * @returns Created quiz record
   */
  async createQuiz(data: CreateQuizDto) {
    const { title, description, createdBy } = data;
    return this.repo.createQuiz({
      title,
      description: description ?? null,
      createdBy,
    });
  }

  /**
   * Returns all quizzes.
   * @returns List of quizzes
   */
  async getAllQuizzes() {
    return this.repo.getAllQuizzes();
  }

  /**
   * Returns a quiz by id.
   * @param id - Quiz ID
   * @returns Quiz details with nested relations
   * @throws ApiError when quiz is not found
   */
  async getQuizById(id: string): Promise<QuizDetailsResponseDto> {
    const quiz = await this.repo.getQuizById(id);
    if (!quiz)
      throw new ApiError(statusCode.notFound, ERROR_CODES.QUIZ_NOT_FOUND);

    return toQuizDetailsResponseDto(quiz);
  }

  /**
   * Adds a question to a quiz.
   * @param quizId - Quiz ID
   * @param data - Question payload
   * @param userId - Authenticated user ID
   * @returns Created question
   * @throws ApiError when quiz is missing, forbidden, or order conflicts
   */
  async addQuestionToQuiz(
    quizId: string,
    data: AddQuestionInputDto,
    userId: string,
    prevOrder?: string,
    nextOrder?: string
  ) {
    await this.assertQuizOwnership(quizId, userId);

    return this.executeWithResolvedOrderRetry({
      quizId,
      prevOrder,
      nextOrder,
      execute: order =>
        this.repo.createQuestion({
          ...data,
          quizId,
          order,
        }),
    });
  }

  /**
   * Adds options to a question with type-specific validation rules.
   * @param questionId - Question ID
   * @param data - Option payload array
   * @param userId - Authenticated user ID
   * @returns Batch insert result
   * @throws ApiError when question is missing, forbidden, or option rules are violated
   */
  async addOptionToQuestion(
    questionId: string,
    data: AddOptionsDto[],
    userId: string
  ) {
    const question = await this.repo.getQuestionById(questionId);
    if (!question) {
      throw new ApiError(statusCode.notFound, ERROR_CODES.QUESTION_NOT_FOUND);
    }

    if (question.quiz.createdBy !== userId) {
      throw new ApiError(statusCode.forbidden, ERROR_CODES.FORBIDDEN);
    }

    validateQuestionOptions(question.type, data);

    try {
      return await this.repo.addOptionToQuestion(questionId, data);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ApiError(
          statusCode.badRequest,
          ERROR_CODES.DUPLICATE_OPTIONS
        );
      }

      throw error;
    }
  }

  /**
   * Reorders a question within a quiz using fractional anchors.
   * @param quizId - Quiz ID
   * @param questionId - Question ID
   * @param userId - Authenticated user ID
   * @param anchors - Reorder anchors (prevReorderToken/nextReorderToken)
   * @returns Updated question
   * @throws ApiError when quiz/question is missing, forbidden, or order conflicts
   */
  async reorderQuestionInQuiz(
    quizId: string,
    questionId: string,
    userId: string,
    anchors: ReorderQuestionDto
  ) {
    await this.assertQuizOwnership(quizId, userId);

    const question = await this.repo.getQuestionForReorder(questionId, quizId);
    if (!question) {
      throw new ApiError(statusCode.notFound, ERROR_CODES.QUESTION_NOT_FOUND);
    }

    const { prevReorderToken, nextReorderToken } = anchors;

    if (
      prevReorderToken === question.order ||
      nextReorderToken === question.order
    ) {
      throw new ApiError(statusCode.badRequest, ERROR_CODES.INVALID_ANCHOR);
    }

    return this.executeWithResolvedOrderRetry({
      quizId,
      prevOrder: prevReorderToken,
      nextOrder: nextReorderToken,
      execute: order => this.repo.updateQuestionOrder(question.id, order),
    });
  }
}
