import { it, expect } from 'vitest';
import {
  describeDb,
  createQuizForUser,
  createRegisteredUser,
} from '../../setup/test-db.js';
import { QuestionType } from '../../../src/generated/prisma/enums.js';
import { QuizRepository } from '../../../src/modules/quiz/quiz.repository.js';
import { QuizService } from '../../../src/modules/quiz/quiz.service.js';
import { ERROR_CODES } from '../../../src/shared/utils/errors/errorCodes.js';
import { statusCode } from '../../../src/shared/utils/http/statusCodes.js';

describeDb('Quiz integration', () => {
  const service = new QuizService(new QuizRepository());

  it('createQuiz and getQuizById returns persisted quiz details', async () => {
    const owner = await createRegisteredUser();

    const created = await service.createQuiz({
      title: 'Integration Quiz',
      description: 'quiz details',
      createdBy: owner.id,
      isPublished: false,
    });

    const found = await service.getQuizById(created.id);

    expect(found.id).toBe(created.id);
    expect(found.title).toBe('Integration Quiz');
    expect(found.questions).toEqual([]);
  });

  it('addQuestionToQuiz returns FORBIDDEN for non-owner', async () => {
    const owner = await createRegisteredUser();
    const anotherUser = await createRegisteredUser();
    const quiz = await createQuizForUser(owner.id, {
      title: 'Owner Quiz',
    });

    await expect(
      service.addQuestionToQuiz(
        quiz.id,
        {
          questionText: 'Who owns this quiz?',
          type: QuestionType.MCQ,
          timeLimit: 20,
          points: 1,
        },
        anotherUser.id
      )
    ).rejects.toMatchObject({
      statusCode: statusCode.forbidden,
      errorCode: ERROR_CODES.FORBIDDEN,
    });
  });

  it('addOptionToQuestion maps duplicate options to DUPLICATE_OPTIONS', async () => {
    const owner = await createRegisteredUser();
    const quiz = await createQuizForUser(owner.id, {
      title: 'Option Quiz',
    });

    const question = await service.addQuestionToQuiz(
      quiz.id,
      {
        questionText: 'Choose one',
        type: QuestionType.MCQ,
        timeLimit: 30,
        points: 1,
      },
      owner.id
    );

    await service.addOptionToQuestion(
      question.id,
      [
        { optionText: 'A', isCorrect: true },
        { optionText: 'B', isCorrect: false },
      ],
      owner.id
    );

    await expect(
      service.addOptionToQuestion(
        question.id,
        [{ optionText: 'A', isCorrect: true }],
        owner.id
      )
    ).rejects.toMatchObject({
      statusCode: statusCode.badRequest,
      errorCode: ERROR_CODES.DUPLICATE_OPTIONS,
    });
  });
});
