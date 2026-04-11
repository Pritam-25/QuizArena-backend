import type { Prisma } from '@generated/prisma/client.js';
import { prisma } from '@infrastructure/database/prismaClient.js';

export class QuizRepository {
  /**
   * Creates a new quiz.
   * @param data - Prisma QuizCreateInput (includes title, description, creator relation)
   * @returns The created Quiz record
   */
  async createQuiz(data: Prisma.QuizCreateInput) {
    return prisma.quiz.create({
      data,
    });
  }

  /**
   * Fetches all quizzes (lightweight).
   * Includes only basic fields + question count.
   * @returns List of quizzes with question count
   */
  async getAllQuizzes() {
    return prisma.quiz.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        createdBy: true,
        createdAt: true,
        _count: {
          select: { questions: true },
        },
      },
    });
  }

  /**
   * Fetch a single quiz with full details.
   * Includes ordered questions and their options.
   * @param id - Quiz ID
   * @returns Quiz with questions and options or null if not found
   */
  async getQuizById(id: string) {
    return prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { options: true },
        },
      },
    });
  }

  /**
   * Fetch a single question with its options.
   * @param id - Question ID
   * @returns Question with options or null if not found
   */
  async getQuestionById(id: string) {
    return prisma.question.findUnique({
      where: { id },
      include: { options: true },
    });
  }

  /**
   * Adds a question to a quiz.
   * Automatically connects the question to the given quizId.
   * @param quizId - ID of the quiz
   * @param questionData - Prisma QuestionCreateInput (without quiz relation)
   * @returns Created Question
   */
  async addQuestionToQuiz(
    quizId: string,
    questionData: Prisma.QuestionCreateInput
  ) {
    return prisma.question.create({
      data: {
        ...questionData,
        quiz: { connect: { id: quizId } },
      },
    });
  }

  /**
   * Adds multiple options to a question.
   * Uses createMany for better performance.
   * @param questionId - ID of the question
   * @param options - Array of option inputs (createMany shape)
   * @returns BatchPayload (count of inserted rows)
   */
  async addOptionToQuestion(
    questionId: string,
    // Accept option inputs that don't include `questionId` (we'll attach it here)
    options: Omit<Prisma.OptionCreateManyInput, 'questionId'>[]
  ) {
    return prisma.option.createMany({
      data: options.map(opt => ({
        ...opt,
        questionId,
      })),
    });
  }
}
