import type { QuestionType } from '@generated/prisma/enums.js';

export type QuizOptionResponseDto = {
  id: string;
  optionText: string;
};

export type QuizQuestionResponseDto = {
  id: string;
  questionText: string;
  type: QuestionType;
  timeLimit: number;
  points: number;
  reorderToken: string;
  index: number;
  options: QuizOptionResponseDto[];
};

export type QuizDetailsResponseDto = {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  questions: QuizQuestionResponseDto[];
};
