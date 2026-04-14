import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestionType } from '../../../src/generated/prisma/enums.js';
import { QuizService } from '../../../src/modules/quiz/quiz.service.js';
import { ERROR_CODES } from '../../../src/shared/utils/errors/errorCodes.js';
import { statusCode } from '../../../src/shared/utils/http/statusCodes.js';
import type { QuizRepository } from '../../../src/modules/quiz/quiz.repository.js';
import * as errorUtils from '../../../src/shared/utils/errors/index.js';

const resolveQuestionOrderMock = vi.hoisted(() => vi.fn());
const validateQuestionOptionsMock = vi.hoisted(() => vi.fn());
const toQuizDetailsResponseDtoMock = vi.hoisted(() => vi.fn());

vi.mock('@modules/quiz/utils/resolveQuestionOrder.js', () => ({
  resolveQuestionOrder: resolveQuestionOrderMock,
}));

vi.mock('@modules/quiz/utils/validateQuestionOptions.js', () => ({
  validateQuestionOptions: validateQuestionOptionsMock,
}));

vi.mock('@modules/quiz/quiz.mapper.js', () => ({
  toQuizDetailsResponseDto: toQuizDetailsResponseDtoMock,
}));

type RepoMock = {
  createQuiz: ReturnType<typeof vi.fn>;
  getAllQuizzes: ReturnType<typeof vi.fn>;
  getQuizById: ReturnType<typeof vi.fn>;
  findQuizById: ReturnType<typeof vi.fn>;
  getLastQuestionOrder: ReturnType<typeof vi.fn>;
  getNearestQuestionOrderAfter: ReturnType<typeof vi.fn>;
  getNearestQuestionOrderBefore: ReturnType<typeof vi.fn>;
  createQuestion: ReturnType<typeof vi.fn>;
  getQuestionById: ReturnType<typeof vi.fn>;
  addOptionToQuestion: ReturnType<typeof vi.fn>;
  getQuestionForReorder: ReturnType<typeof vi.fn>;
  updateQuestionOrder: ReturnType<typeof vi.fn>;
};

function buildRepoMock(): RepoMock {
  return {
    createQuiz: vi.fn(),
    getAllQuizzes: vi.fn(),
    getQuizById: vi.fn(),
    findQuizById: vi.fn(),
    getLastQuestionOrder: vi.fn(),
    getNearestQuestionOrderAfter: vi.fn(),
    getNearestQuestionOrderBefore: vi.fn(),
    createQuestion: vi.fn(),
    getQuestionById: vi.fn(),
    addOptionToQuestion: vi.fn(),
    getQuestionForReorder: vi.fn(),
    updateQuestionOrder: vi.fn(),
  };
}

describe('QuizService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createQuiz maps undefined description to null', async () => {
    const repo = buildRepoMock();
    const service = new QuizService(repo as unknown as QuizRepository);

    repo.createQuiz.mockResolvedValue({ id: 'quiz-1' });

    await service.createQuiz({
      title: 'Quiz title',
      createdBy: 'user-1',
      isPublished: false,
    });

    expect(repo.createQuiz).toHaveBeenCalledWith({
      title: 'Quiz title',
      description: null,
      createdBy: 'user-1',
    });
  });

  it('getQuizById throws QUIZ_NOT_FOUND when missing', async () => {
    const repo = buildRepoMock();
    const service = new QuizService(repo as unknown as QuizRepository);

    repo.getQuizById.mockResolvedValue(null);

    await expect(service.getQuizById('quiz-404')).rejects.toMatchObject({
      statusCode: statusCode.notFound,
      errorCode: ERROR_CODES.QUIZ_NOT_FOUND,
    });
  });

  it('getQuizById maps result using quiz mapper', async () => {
    const repo = buildRepoMock();
    const service = new QuizService(repo as unknown as QuizRepository);

    repo.getQuizById.mockResolvedValue({ id: 'quiz-1' });
    toQuizDetailsResponseDtoMock.mockReturnValue({
      id: 'quiz-1',
      questions: [],
    });

    const result = await service.getQuizById('quiz-1');

    expect(toQuizDetailsResponseDtoMock).toHaveBeenCalledWith({ id: 'quiz-1' });
    expect(result).toEqual({ id: 'quiz-1', questions: [] });
  });

  it('addQuestionToQuiz throws FORBIDDEN when quiz owner mismatches', async () => {
    const repo = buildRepoMock();
    const service = new QuizService(repo as unknown as QuizRepository);

    repo.findQuizById.mockResolvedValue({
      id: 'quiz-1',
      createdBy: 'other-user',
    });

    await expect(
      service.addQuestionToQuiz(
        'quiz-1',
        {
          questionText: 'Q1',
          type: QuestionType.MCQ,
          timeLimit: 30,
          points: 1,
        },
        'owner-user'
      )
    ).rejects.toMatchObject({
      statusCode: statusCode.forbidden,
      errorCode: ERROR_CODES.FORBIDDEN,
    });
  });

  it('addQuestionToQuiz creates question with resolved order', async () => {
    const repo = buildRepoMock();
    const service = new QuizService(repo as unknown as QuizRepository);

    repo.findQuizById.mockResolvedValue({
      id: 'quiz-1',
      createdBy: 'owner-user',
    });
    resolveQuestionOrderMock.mockResolvedValue('m');
    repo.createQuestion.mockResolvedValue({ id: 'question-1', order: 'm' });

    const payload = {
      questionText: 'Q1',
      type: QuestionType.MCQ,
      timeLimit: 30,
      points: 1,
    };

    const result = await service.addQuestionToQuiz(
      'quiz-1',
      payload,
      'owner-user',
      'a'
    );

    expect(resolveQuestionOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        quizId: 'quiz-1',
        prevOrder: 'a',
      })
    );
    expect(repo.createQuestion).toHaveBeenCalledWith({
      ...payload,
      quizId: 'quiz-1',
      order: 'm',
    });
    expect(result).toEqual({ id: 'question-1', order: 'm' });
  });

  it('addOptionToQuestion throws QUESTION_NOT_FOUND when question is missing', async () => {
    const repo = buildRepoMock();
    const service = new QuizService(repo as unknown as QuizRepository);

    repo.getQuestionById.mockResolvedValue(null);

    await expect(
      service.addOptionToQuestion('question-404', [], 'user-1')
    ).rejects.toMatchObject({
      statusCode: statusCode.notFound,
      errorCode: ERROR_CODES.QUESTION_NOT_FOUND,
    });
  });

  it('addOptionToQuestion bubbles repository errors', async () => {
    const repo = buildRepoMock();
    const service = new QuizService(repo as unknown as QuizRepository);

    repo.getQuestionById.mockResolvedValue({
      id: 'question-1',
      type: QuestionType.MCQ,
      quiz: { createdBy: 'user-1' },
    });

    const dbError = new Error('duplicate');
    repo.addOptionToQuestion.mockRejectedValue(dbError);

    await expect(
      service.addOptionToQuestion(
        'question-1',
        [{ optionText: 'A', isCorrect: true }],
        'user-1'
      )
    ).rejects.toBe(dbError);
  });

  it('addOptionToQuestion surfaces validation errors from validateQuestionOptions', async () => {
    const repo = buildRepoMock();
    const service = new QuizService(repo as unknown as QuizRepository);

    repo.getQuestionById.mockResolvedValue({
      id: 'question-1',
      type: QuestionType.MCQ,
      quiz: { createdBy: 'user-1' },
    });

    const validationError = new Error('invalid options');
    validateQuestionOptionsMock.mockImplementationOnce(() => {
      throw validationError;
    });

    await expect(
      service.addOptionToQuestion(
        'question-1',
        [{ optionText: 'A', isCorrect: true }],
        'user-1'
      )
    ).rejects.toBe(validationError);

    expect(repo.addOptionToQuestion).not.toHaveBeenCalled();
  });

  it('reorderQuestionInQuiz updates order successfully', async () => {
    const repo = buildRepoMock();
    const service = new QuizService(repo as unknown as QuizRepository);

    repo.findQuizById.mockResolvedValue({ id: 'quiz-1', createdBy: 'user-1' });
    repo.getQuestionForReorder.mockResolvedValue({
      id: 'question-1',
      quizId: 'quiz-1',
      order: 'm',
    });
    resolveQuestionOrderMock.mockResolvedValue('n');
    repo.updateQuestionOrder.mockResolvedValue({
      id: 'question-1',
      quizId: 'quiz-1',
      order: 'n',
    });

    const result = await service.reorderQuestionInQuiz(
      'quiz-1',
      'question-1',
      'user-1',
      {
        prevReorderToken: 'g',
        nextReorderToken: 't',
      }
    );

    expect(repo.updateQuestionOrder).toHaveBeenCalledWith('question-1', 'n');
    expect(result).toEqual({
      id: 'question-1',
      quizId: 'quiz-1',
      order: 'n',
    });
  });

  it('reorderQuestionInQuiz retries with refreshed anchors on unique conflict', async () => {
    const repo = buildRepoMock();
    const service = new QuizService(repo as unknown as QuizRepository);

    repo.findQuizById.mockResolvedValue({ id: 'quiz-1', createdBy: 'user-1' });
    repo.getQuestionForReorder.mockResolvedValue({
      id: 'question-1',
      quizId: 'quiz-1',
      order: 'm',
    });

    const dbConflictError = new Error('unique constraint');
    repo.updateQuestionOrder
      .mockRejectedValueOnce(dbConflictError)
      .mockResolvedValueOnce({
        id: 'question-1',
        quizId: 'quiz-1',
        order: 'i',
      });

    repo.getNearestQuestionOrderAfter.mockResolvedValue({ order: 't' });
    resolveQuestionOrderMock
      .mockResolvedValueOnce('h')
      .mockResolvedValueOnce('i');

    const normalizeDbErrorSpy = vi
      .spyOn(errorUtils, 'normalizeDbError')
      .mockReturnValue(ERROR_CODES.DUPLICATE_QUESTION_ORDER);

    const result = await service.reorderQuestionInQuiz(
      'quiz-1',
      'question-1',
      'user-1',
      {
        prevReorderToken: 'g',
        nextReorderToken: 'z',
      }
    );

    expect(repo.getNearestQuestionOrderAfter).toHaveBeenCalledWith(
      'quiz-1',
      'g',
      'z'
    );
    expect(resolveQuestionOrderMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        prevOrder: 'g',
        nextOrder: 't',
      })
    );
    expect(result.order).toBe('i');
    normalizeDbErrorSpy.mockRestore();
  });

  it('reorderQuestionInQuiz throws DUPLICATE_QUESTION_ORDER after retry exhaustion', async () => {
    const repo = buildRepoMock();
    const service = new QuizService(repo as unknown as QuizRepository);

    repo.findQuizById.mockResolvedValue({ id: 'quiz-1', createdBy: 'user-1' });
    repo.getQuestionForReorder.mockResolvedValue({
      id: 'question-1',
      quizId: 'quiz-1',
      order: 'm',
    });

    resolveQuestionOrderMock
      .mockResolvedValueOnce('h')
      .mockResolvedValueOnce('i');

    const dbConflictError = new Error('unique constraint');
    repo.updateQuestionOrder
      .mockRejectedValueOnce(dbConflictError)
      .mockRejectedValueOnce(dbConflictError);

    repo.getNearestQuestionOrderAfter.mockResolvedValue({ order: 't' });

    const normalizeDbErrorSpy = vi
      .spyOn(errorUtils, 'normalizeDbError')
      .mockReturnValue(ERROR_CODES.DUPLICATE_QUESTION_ORDER);

    await expect(
      service.reorderQuestionInQuiz('quiz-1', 'question-1', 'user-1', {
        prevReorderToken: 'g',
        nextReorderToken: 'z',
      })
    ).rejects.toMatchObject({
      statusCode: statusCode.badRequest,
      errorCode: ERROR_CODES.DUPLICATE_QUESTION_ORDER,
    });

    expect(repo.updateQuestionOrder).toHaveBeenCalledTimes(2);
    normalizeDbErrorSpy.mockRestore();
  });

  it('reorderQuestionInQuiz throws INVALID_ANCHOR when next token equals current order', async () => {
    const repo = buildRepoMock();
    const service = new QuizService(repo as unknown as QuizRepository);

    repo.findQuizById.mockResolvedValue({ id: 'quiz-1', createdBy: 'user-1' });
    repo.getQuestionForReorder.mockResolvedValue({
      id: 'question-1',
      quizId: 'quiz-1',
      order: 'm',
    });

    await expect(
      service.reorderQuestionInQuiz('quiz-1', 'question-1', 'user-1', {
        nextReorderToken: 'm',
      })
    ).rejects.toMatchObject({
      statusCode: statusCode.badRequest,
      errorCode: ERROR_CODES.INVALID_ANCHOR,
    });
  });
});
