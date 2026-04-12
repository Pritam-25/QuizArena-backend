import type { QuestionType } from '@generated/prisma/enums.js';
import type { QuizDetailsResponseDto } from './quiz.dto.js';

type QuizOptionEntity = {
  id: string;
  optionText: string;
  isCorrect: boolean;
};

type QuizQuestionEntity = {
  id: string;
  questionText: string;
  type: QuestionType;
  timeLimit: number;
  points: number;
  order: string;
  options: QuizOptionEntity[];
};

type QuizDetailsEntity = {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  questions: QuizQuestionEntity[];
};

export function toQuizDetailsResponseDto(
  quiz: QuizDetailsEntity
): QuizDetailsResponseDto {
  const sortedQuestions = [...quiz.questions].sort((a, b) =>
    a.order.localeCompare(b.order)
  );

  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    isPublished: quiz.isPublished,
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,
    createdBy: quiz.createdBy,
    questions: sortedQuestions.map((question, index) => ({
      id: question.id,
      questionText: question.questionText,
      type: question.type,
      timeLimit: question.timeLimit,
      points: question.points,
      index: index + 1,
      options: question.options.map(option => ({
        id: option.id,
        optionText: option.optionText,
      })),
    })),
  };
}
