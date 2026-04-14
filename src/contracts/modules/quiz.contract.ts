import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  addOptionsSchema,
  addQuestionSchema,
  createQuizSchema,
  reorderQuestionSchema,
} from '@modules/quiz/quiz.schema.js';
import {
  createSuccessResponseSchema,
  errorResponseSchema,
  questionShapeSchema,
  quizShapeSchema,
} from '@contracts/common.js';

const c = initContract();

export const quizContract = c.router(
  {
    createQuiz: {
      method: 'POST',
      path: '/quizzes',
      summary: 'Create a quiz',
      body: createQuizSchema,
      responses: {
        201: createSuccessResponseSchema(quizShapeSchema),
        401: errorResponseSchema,
      },
      metadata: { tags: ['Quiz'] },
    },
    getQuizzes: {
      method: 'GET',
      path: '/quizzes',
      summary: 'Get all quizzes',
      responses: {
        200: createSuccessResponseSchema(z.array(quizShapeSchema)),
      },
      metadata: { tags: ['Quiz'] },
    },
    getQuizById: {
      method: 'GET',
      path: '/quizzes/:id',
      summary: 'Get quiz by id',
      pathParams: z.object({ id: z.uuid() }),
      responses: {
        200: createSuccessResponseSchema(quizShapeSchema),
        404: errorResponseSchema,
      },
      metadata: { tags: ['Quiz'] },
    },
    addQuestionToQuiz: {
      method: 'POST',
      path: '/quizzes/:quizId/questions',
      summary: 'Add question to quiz',
      pathParams: z.object({ quizId: z.uuid() }),
      body: addQuestionSchema,
      responses: {
        201: createSuccessResponseSchema(questionShapeSchema),
        401: errorResponseSchema,
      },
      metadata: { tags: ['Quiz'] },
    },
    addOptionsToQuestion: {
      method: 'POST',
      path: '/quizzes/questions/:questionId/options',
      summary: 'Add options to question',
      pathParams: z.object({ questionId: z.uuid() }),
      body: z.array(addOptionsSchema),
      responses: {
        201: createSuccessResponseSchema(z.unknown()),
      },
      metadata: { tags: ['Quiz'] },
    },
    reorderQuestion: {
      method: 'PATCH',
      path: '/quizzes/:quizId/questions/:questionId/reorder',
      summary: 'Reorder a question inside a quiz',
      pathParams: z.object({
        quizId: z.uuid(),
        questionId: z.uuid(),
      }),
      body: reorderQuestionSchema,
      responses: {
        200: createSuccessResponseSchema(questionShapeSchema),
      },
      metadata: { tags: ['Quiz'] },
    },
  },
  { metadata: { tags: ['Quiz'] } }
);
