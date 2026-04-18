import { initContract } from '@ts-rest/core';
import { z } from 'zod3';
import {
  createSuccessResponseSchema,
  errorResponseSchema,
  questionShapeSchema,
  quizShapeSchema,
} from '@contracts/common.js';
import {
  addOptionsItemBodySchema,
  addQuestionBodySchema,
  createQuizBodySchema,
  questionIdParamSchema,
  quizIdParamSchema,
  reorderQuestionBodySchema,
  uuidParamSchema,
} from '@contracts/schemas.js';

const c = initContract();

export const quizContract = c.router(
  {
    createQuiz: {
      method: 'POST',
      path: '/quizzes',
      summary: 'Create a quiz',
      body: createQuizBodySchema,
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
      pathParams: uuidParamSchema,
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
      pathParams: quizIdParamSchema,
      body: addQuestionBodySchema,
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
      pathParams: questionIdParamSchema,
      body: z
        .array(addOptionsItemBodySchema)
        .default([addOptionsItemBodySchema.parse({})]) as any,
      responses: {
        201: createSuccessResponseSchema(z.array(quizShapeSchema)),
      },
      metadata: { tags: ['Quiz'] },
    },
    reorderQuestion: {
      method: 'PATCH',
      path: '/quizzes/:quizId/questions/:questionId/reorder',
      summary: 'Reorder a question inside a quiz',
      pathParams: quizIdParamSchema.merge(questionIdParamSchema),
      body: reorderQuestionBodySchema,
      responses: {
        200: createSuccessResponseSchema(questionShapeSchema),
      },
      metadata: { tags: ['Quiz'] },
    },
  },
  { metadata: { tags: ['Quiz'] } }
);
