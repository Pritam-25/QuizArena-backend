import { ApiError } from '@shared/utils/errors/apiError.js';
import { QuizRepository } from './quiz.repository.js';
import type {
  AddOptionsDto,
  AddQuestionDto,
  CreateQuizDto,
} from './quiz.schema.js';
import { statusCode } from '@shared/utils/http/statusCodes.js';
import { ERROR_CODES } from '@shared/utils/errors/errorCodes.js';
import { QuestionType } from '@generated/prisma/enums.js';

export class QuizService {
  constructor(private repo: QuizRepository) {}

  async createQuiz(data: CreateQuizDto) {
    const { title, description, createdBy } = data;
    return this.repo.createQuiz({
      title,
      description: description ?? null,
      creator: { connect: { id: createdBy } },
    });
  }

  async getAllQuizzes() {
    return this.repo.getAllQuizzes();
  }

  async getQuizById(id: string) {
    const quiz = await this.repo.getQuizById(id);
    if (!quiz)
      throw new ApiError(statusCode.notFound, ERROR_CODES.QUIZ_NOT_FOUND);
    return quiz;
  }

  async addQuestionToQuiz(quizId: string, data: AddQuestionDto) {
    const { questionText, type, timeLimit, points, order } = data;
    return this.repo.addQuestionToQuiz(quizId, {
      questionText,
      type,
      timeLimit,
      points,
      order,
      quiz: { connect: { id: quizId } },
    });
  }

  async addOptionToQuestion(questionId: string, data: AddOptionsDto[]) {
    const question = await this.repo.getQuestionById(questionId);
    if (!question) {
      throw new ApiError(statusCode.notFound, ERROR_CODES.QUESTION_NOT_FOUND);
    }

    const correctOptionsCount = data.filter(opt => opt.isCorrect).length;

    switch (question.type) {
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
        if (data.length !== 2 || correctOptionsCount !== 1) {
          throw new ApiError(
            statusCode.badRequest,
            ERROR_CODES.INVALID_OPTIONS,
            'True/False questions must have exactly two options with one correct'
          );
        }
        break;

      case QuestionType.FILL_IN_THE_BLANK:
        if (data.length > 0 || correctOptionsCount > 0) {
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

    return this.repo.addOptionToQuestion(questionId, data);
  }
}
