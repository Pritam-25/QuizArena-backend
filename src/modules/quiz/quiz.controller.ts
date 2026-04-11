import { ApiError } from '@shared/utils/errors/apiError.js';
import type { QuizService } from './quiz.service.js';
import { statusCode, successResponse } from '@shared/utils/http/index.js';
import { ERROR_CODES } from '@shared/utils/errors/index.js';
import type { Request, Response } from 'express';
import type {
  CreateQuizDto,
  CreateQuizInputDto,
  AddQuestionDto,
  AddOptionsDto,
} from './quiz.schema.js';

export class QuizController {
  /**
   * Creates controller instance for quiz HTTP handlers.
   * @param service - Quiz service instance
   */
  constructor(private service: QuizService) {}

  /**
   * Creates a quiz for the authenticated user.
   * @param req - Express request
   * @param res - Express response
   */
  async createQuiz(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(statusCode.unauthorized, ERROR_CODES.UNAUTHORIZED);
    }

    const payload = req.body as CreateQuizInputDto;
    const quizData: CreateQuizDto = {
      ...payload,
      createdBy: userId,
    };

    const quiz = await this.service.createQuiz(quizData);
    return res
      .status(statusCode.created)
      .json(successResponse('Quiz created', quiz));
  }

  /**
   * Fetches all quizzes.
   * @param _req - Express request
   * @param res - Express response
   */
  async getAllQuizzes(_req: Request, res: Response) {
    const quizzes = await this.service.getAllQuizzes();
    return res
      .status(statusCode.success)
      .json(successResponse('Quizzes fetched successfully', quizzes));
  }

  /**
   * Fetches one quiz by id.
   * @param req - Express request
   * @param res - Express response
   */
  async getQuizById(req: Request, res: Response) {
    const id = req.params.id as string;
    const quiz = await this.service.getQuizById(id);
    return res
      .status(statusCode.success)
      .json(successResponse('Quiz fetched successfully', quiz));
  }

  /**
   * Adds a question to a quiz.
   * @param req - Express request
   * @param res - Express response
   */
  async addQuestionToQuiz(req: Request, res: Response) {
    const quizId = req.params.quizId as string;
    const payload = req.body as AddQuestionDto;
    const question = await this.service.addQuestionToQuiz(quizId, payload);
    return res
      .status(statusCode.created)
      .json(successResponse('Question added', question));
  }

  /**
   * Adds options to a question.
   * @param req - Express request
   * @param res - Express response
   */
  async addOptionToQuestion(req: Request, res: Response) {
    const questionId = req.params.questionId as string;
    const payload = req.body as AddOptionsDto[];
    const result = await this.service.addOptionToQuestion(questionId, payload);
    return res
      .status(statusCode.created)
      .json(successResponse('Options added', result));
  }
}
