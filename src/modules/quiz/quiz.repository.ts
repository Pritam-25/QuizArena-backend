import type { Prisma } from '@generated/prisma/client.js';
import { prisma } from '@infrastructure/database/prismaClient.js';

export class QuizRepository {
  /**
   * Creates a new quiz.
   * @param data - Prisma QuizUncheckedCreateInput (includes title, description, createdBy)
   * @returns The created Quiz record
   */
  async createQuiz(data: Prisma.QuizUncheckedCreateInput) {
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
   * Fetch quiz ownership metadata.
   * @param id - Quiz ID
   * @returns Quiz id and creator id or null if not found
   */
  async findQuizById(id: string) {
    return prisma.quiz.findUnique({
      where: { id },
      select: {
        id: true,
        createdBy: true,
      },
    });
  }

  /**
   * Fetches the highest current order key for a quiz.
   * @param quizId - Quiz ID
   * @returns Last order key or null if quiz has no questions
   */
  async getLastQuestionOrder(quizId: string) {
    return prisma.question.findFirst({
      where: { quizId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
  }

  /**
   * Fetch question metadata required for add-option validation and ownership checks.
   * @param id - Question ID
   * @returns Question type and parent quiz creator id or null if not found
   */
  async getQuestionById(id: string) {
    return prisma.question.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        quiz: {
          select: {
            createdBy: true,
          },
        },
      },
    });
  }

  /**
   * Fetch question metadata needed for reorder operations.
   * @param questionId - Question ID
   * @param quizId - Quiz ID
   * @returns Question id/order/quizId or null if not found in the quiz
   */
  async getQuestionForReorder(questionId: string, quizId: string) {
    return prisma.question.findFirst({
      where: {
        id: questionId,
        quizId,
      },
      select: {
        id: true,
        quizId: true,
        order: true,
      },
    });
  }

  /**
   * Creates a question row.
   * @param data - Prisma QuestionUncheckedCreateInput
   * @returns Created Question
   */
  async createQuestion(data: Prisma.QuestionUncheckedCreateInput) {
    return prisma.question.create({
      data,
    });
  }

  /**
   * Updates the order key of a question.
   * @param questionId - Question ID
   * @param order - New fractional order key
   * @returns Updated question
   */
  async updateQuestionOrder(questionId: string, order: string) {
    return prisma.question.update({
      where: { id: questionId },
      data: { order },
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
