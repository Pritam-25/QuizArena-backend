import { ApiError } from '@shared/utils/errors/apiError.js';
import type { QuizService } from './quiz.service.js';
import { statusCode } from '@shared/utils/http/index.js';
import { ERROR_CODES } from '@shared/utils/errors/index.js';
import type { Request, Response } from 'express';
import type {
  CreateQuizDto,
  AddQuestionDto,
  AddOptionsDto,
} from './quiz.schema.js';

export class QuizController {
  constructor(private service: QuizService) {}

  async createQuiz(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(statusCode.unauthorized, ERROR_CODES.UNAUTHORIZED);
    }

    const payload = req.body as CreateQuizDto;
    const quizData = {
      ...payload,
      createdBy: userId,
    };

    const quiz = await this.service.createQuiz(quizData);
    res
      .status(statusCode.created)
      .json({ message: 'Quiz created', data: quiz });
  }

  async getAllQuizzes(_req: Request, res: Response) {
    const quizzes = await this.service.getAllQuizzes();
    res.status(statusCode.success).json({ data: quizzes });
  }

  async getQuizById(req: Request, res: Response) {
    const id = req.params.id as string;
    const quiz = await this.service.getQuizById(id);
    res.status(statusCode.success).json({ data: quiz });
  }

  async addQuestionToQuiz(req: Request, res: Response) {
    const quizId = req.params.quizId as string;
    const payload = req.body as AddQuestionDto;
    const question = await this.service.addQuestionToQuiz(quizId, payload);
    res
      .status(statusCode.created)
      .json({ message: 'Question added', data: question });
  }

  async addOptionToQuestion(req: Request, res: Response) {
    const questionId = req.params.questionId as string;
    const payload = req.body as AddOptionsDto[];
    const result = await this.service.addOptionToQuestion(questionId, payload);
    res
      .status(statusCode.created)
      .json({ message: 'Options added', data: result });
  }
}
