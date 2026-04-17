import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionStatus } from '../../../src/generated/prisma/enums.js';
import { SessionService } from '../../../src/modules/session/session.service.js';
import type { SessionRepository } from '../../../src/modules/session/session.repository.js';
import { ERROR_CODES } from '../../../src/shared/utils/errors/errorCodes.js';
import { statusCode } from '../../../src/shared/utils/http/statusCodes.js';

// ─── Repo Mock ───────────────────────────────────────────────────────────────

// ─── StateRepo Mock ──────────────────────────────────────────────────────────
type StateRepoMock = {
  setActiveQuestion: ReturnType<typeof vi.fn>;
  getActiveQuestion: ReturnType<typeof vi.fn>;
  getAllAnswers: ReturnType<typeof vi.fn>;
  clearQuestionAnswers: ReturnType<typeof vi.fn>;
  incrementScore: ReturnType<typeof vi.fn>;
  getLeaderboard: ReturnType<typeof vi.fn>;
  initLeaderboard: ReturnType<typeof vi.fn>;
  setSessionEnded: ReturnType<typeof vi.fn>;
};

function buildStateRepoMock(): StateRepoMock {
  return {
    setActiveQuestion: vi.fn(),
    getActiveQuestion: vi.fn(),
    getAllAnswers: vi.fn(),
    clearQuestionAnswers: vi.fn(),
    incrementScore: vi.fn(),
    getLeaderboard: vi.fn(),
    initLeaderboard: vi.fn(),
    setSessionEnded: vi.fn(),
  };
}

// ─── SessionQueue Mock ──────────────────────────────────────────────────────
type SessionQueueMock = {
  scheduleQuestionEvaluation: ReturnType<typeof vi.fn>;
};

function buildSessionQueueMock(): SessionQueueMock {
  return {
    scheduleQuestionEvaluation: vi.fn(),
  };
}

type RepoMock = {
  createSession: ReturnType<typeof vi.fn>;
  deleteSession: ReturnType<typeof vi.fn>;
  findSessionByJoinCode: ReturnType<typeof vi.fn>;
  findSessionById: ReturnType<typeof vi.fn>;
  findSessionWithQuestions: ReturnType<typeof vi.fn>;
  findQuestionWithOptions: ReturnType<typeof vi.fn>;
  addParticipant: ReturnType<typeof vi.fn>;
  deleteParticipant: ReturnType<typeof vi.fn>;
  updateSessionStatus: ReturnType<typeof vi.fn>;
  findParticipantsBySession: ReturnType<typeof vi.fn>;
  createAnswerBatch: ReturnType<typeof vi.fn>;
  updateParticipantScores: ReturnType<typeof vi.fn>;
};

function buildRepoMock(): RepoMock {
  return {
    createSession: vi.fn(),
    deleteSession: vi.fn(),
    findSessionByJoinCode: vi.fn(),
    findSessionById: vi.fn(),
    findSessionWithQuestions: vi.fn(),
    findQuestionWithOptions: vi.fn(),
    addParticipant: vi.fn(),
    deleteParticipant: vi.fn(),
    updateSessionStatus: vi.fn(),
    findParticipantsBySession: vi.fn(),
    createAnswerBatch: vi.fn(),
    updateParticipantScores: vi.fn(),
  };
}

// ─── Test Data ───────────────────────────────────────────────────────────────

const buildSessionWithQuestions = (overrides?: {
  status?: SessionStatus;
  currentQuestionIndex?: number;
  questionCount?: number;
}) => ({
  id: 'session-1',
  quizId: 'quiz-1',
  hostId: 'host-1',
  joinCode: 'join-code',
  status: overrides?.status ?? SessionStatus.LIVE,
  currentQuestionIndex: overrides?.currentQuestionIndex ?? 0,
  startedAt: new Date(),
  endedAt: null,
  createdAt: new Date(),
  quiz: {
    id: 'quiz-1',
    questions: Array.from(
      { length: overrides?.questionCount ?? 2 },
      (_, i) => ({
        id: `question-${i + 1}`,
        questionText: `Question ${i + 1}?`,
        type: 'MCQ',
        timeLimit: 30,
        points: 10,
        order: String.fromCharCode(97 + i),
        quizId: 'quiz-1',
        options: [
          {
            id: `option-${i + 1}-correct`,
            optionText: 'Correct Answer',
            isCorrect: true,
            questionId: `question-${i + 1}`,
          },
          {
            id: `option-${i + 1}-wrong`,
            optionText: 'Wrong Answer',
            isCorrect: false,
            questionId: `question-${i + 1}`,
          },
        ],
      })
    ),
  },
  participants: [
    { id: 'participant-1', nickname: 'Player1', score: 0 },
    { id: 'participant-2', nickname: 'Player2', score: 0 },
  ],
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SessionService – advanceQuestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('advances to the next question and schedules evaluation', async () => {
    const repo = buildRepoMock();
    const stateRepo = buildStateRepoMock();
    const sessionQueue = buildSessionQueueMock();
    const service = new SessionService(
      repo as SessionRepository,
      stateRepo,
      sessionQueue
    );
    const session = buildSessionWithQuestions();

    repo.findSessionWithQuestions.mockResolvedValue(session);
    repo.updateSessionStatus.mockResolvedValue({
      ...session,
      currentQuestionIndex: 1,
    });

    const result = await service.advanceQuestion('session-1');

    expect(result.questionIndex).toBe(0);
    expect(result.totalQuestions).toBe(2);
    expect(result.question.id).toBe('question-1');
    // Options should NOT include isCorrect
    expect(result.question.options).toEqual([
      { id: 'option-1-correct', optionText: 'Correct Answer' },
      { id: 'option-1-wrong', optionText: 'Wrong Answer' },
    ]);

    expect(stateRepo.setActiveQuestion).toHaveBeenCalledWith(
      'session-1',
      'question-1',
      0,
      expect.any(Number)
    );
    expect(sessionQueue.scheduleQuestionEvaluation).toHaveBeenCalledWith(
      'session-1',
      'question-1',
      30_000
    );
    expect(repo.updateSessionStatus).toHaveBeenCalledWith('session-1', {
      currentQuestionIndex: 1,
    });
  });

  it('throws SESSION_NOT_FOUND when session missing', async () => {
    const repo = buildRepoMock();
    const stateRepo = buildStateRepoMock();
    const sessionQueue = buildSessionQueueMock();
    const service = new SessionService(
      repo as SessionRepository,
      stateRepo,
      sessionQueue
    );

    repo.findSessionWithQuestions.mockResolvedValue(null);

    await expect(service.advanceQuestion('session-1')).rejects.toMatchObject({
      statusCode: statusCode.notFound,
      errorCode: ERROR_CODES.SESSION_NOT_FOUND,
    });
  });

  it('throws SESSION_NOT_LIVE when session is not LIVE', async () => {
    const repo = buildRepoMock();
    const stateRepo = buildStateRepoMock();
    const sessionQueue = buildSessionQueueMock();
    const service = new SessionService(
      repo as SessionRepository,
      stateRepo,
      sessionQueue
    );

    repo.findSessionWithQuestions.mockResolvedValue(
      buildSessionWithQuestions({ status: SessionStatus.WAITING })
    );

    await expect(service.advanceQuestion('session-1')).rejects.toMatchObject({
      statusCode: statusCode.badRequest,
      errorCode: ERROR_CODES.SESSION_NOT_LIVE,
    });
  });

  it('throws INVALID_QUESTION_INDEX when all questions exhausted', async () => {
    const repo = buildRepoMock();
    const stateRepo = buildStateRepoMock();
    const sessionQueue = buildSessionQueueMock();
    const service = new SessionService(
      repo as SessionRepository,
      stateRepo,
      sessionQueue
    );

    repo.findSessionWithQuestions.mockResolvedValue(
      buildSessionWithQuestions({ currentQuestionIndex: 2, questionCount: 2 })
    );

    await expect(service.advanceQuestion('session-1')).rejects.toMatchObject({
      statusCode: statusCode.badRequest,
      errorCode: ERROR_CODES.INVALID_QUESTION_INDEX,
    });
  });
});

describe('SessionService – evaluateQuestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('evaluates correct MCQ answer and increments score', async () => {
    const repo = buildRepoMock();
    const stateRepo = buildStateRepoMock();
    const sessionQueue = buildSessionQueueMock();
    const service = new SessionService(
      repo as SessionRepository,
      stateRepo,
      sessionQueue
    );

    // Participant answered with the correct option
    stateRepo.getAllAnswers.mockResolvedValue({
      'participant-1': 'option-1-correct',
      'participant-2': 'option-1-wrong',
    });

    repo.findQuestionWithOptions.mockResolvedValue({
      id: 'question-1',
      questionText: 'Question 1?',
      type: 'MCQ',
      timeLimit: 30,
      points: 10,
      order: 'a',
      quizId: 'quiz-1',
      options: [
        {
          id: 'option-1-correct',
          optionText: 'Correct',
          isCorrect: true,
          questionId: 'question-1',
        },
        {
          id: 'option-1-wrong',
          optionText: 'Wrong',
          isCorrect: false,
          questionId: 'question-1',
        },
      ],
    });

    stateRepo.getLeaderboard.mockResolvedValue([
      { participantId: 'participant-1', score: 10 },
      { participantId: 'participant-2', score: 0 },
    ]);

    repo.findParticipantsBySession.mockResolvedValue([
      { id: 'participant-1', nickname: 'Player1', score: 0 },
      { id: 'participant-2', nickname: 'Player2', score: 0 },
    ]);

    repo.createAnswerBatch.mockResolvedValue(undefined);

    // Not the last question
    repo.findSessionWithQuestions.mockResolvedValue(
      buildSessionWithQuestions({ currentQuestionIndex: 1, questionCount: 2 })
    );

    const { result, isLastQuestion } = await service.evaluateQuestion(
      'session-1',
      'question-1'
    );

    expect(result.correctOptionId).toBe('option-1-correct');
    expect(result.leaderboard).toHaveLength(2);
    expect(result.leaderboard[0]).toMatchObject({
      participantId: 'participant-1',
      nickname: 'Player1',
      score: 10,
      rank: 1,
    });
    expect(result.leaderboard[1]).toMatchObject({
      participantId: 'participant-2',
      nickname: 'Player2',
      score: 0,
      rank: 2,
    });
    expect(isLastQuestion).toBe(false);

    // Score incremented only for correct answer
    expect(stateRepo.incrementScore).toHaveBeenCalledTimes(1);
    expect(stateRepo.incrementScore).toHaveBeenCalledWith(
      'session-1',
      'participant-1',
      10
    );

    // Answers persisted to DB
    expect(repo.createAnswerBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        participantId: 'participant-1',
        optionId: 'option-1-correct',
        isCorrect: true,
        scoreEarned: 10,
      }),
      expect.objectContaining({
        participantId: 'participant-2',
        optionId: 'option-1-wrong',
        isCorrect: false,
        scoreEarned: 0,
      }),
    ]);

    // Cleanup
    expect(stateRepo.clearQuestionAnswers).toHaveBeenCalledWith(
      'session-1',
      'question-1'
    );
  });

  it('evaluates incorrect answer with score 0', async () => {
    const repo = buildRepoMock();
    const stateRepo = buildStateRepoMock();
    const sessionQueue = buildSessionQueueMock();
    const service = new SessionService(
      repo as SessionRepository,
      stateRepo,
      sessionQueue
    );

    stateRepo.getAllAnswers.mockResolvedValue({
      'participant-1': 'option-1-wrong',
    });

    repo.findQuestionWithOptions.mockResolvedValue({
      id: 'question-1',
      questionText: 'Q?',
      type: 'MCQ',
      timeLimit: 30,
      points: 10,
      order: 'a',
      quizId: 'quiz-1',
      options: [
        {
          id: 'option-1-correct',
          optionText: 'Correct',
          isCorrect: true,
          questionId: 'question-1',
        },
        {
          id: 'option-1-wrong',
          optionText: 'Wrong',
          isCorrect: false,
          questionId: 'question-1',
        },
      ],
    });

    stateRepo.getLeaderboard.mockResolvedValue([
      { participantId: 'participant-1', score: 0 },
    ]);

    repo.findParticipantsBySession.mockResolvedValue([
      { id: 'participant-1', nickname: 'Player1', score: 0 },
    ]);

    repo.createAnswerBatch.mockResolvedValue(undefined);
    repo.findSessionWithQuestions.mockResolvedValue(
      buildSessionWithQuestions({ currentQuestionIndex: 1, questionCount: 2 })
    );

    const { result } = await service.evaluateQuestion(
      'session-1',
      'question-1'
    );

    expect(stateRepo.incrementScore).not.toHaveBeenCalled();
    expect(result.leaderboard[0]?.score).toBe(0);
  });

  it('evaluates FILL_IN_THE_BLANK with case-insensitive match', async () => {
    const repo = buildRepoMock();
    const stateRepo = buildStateRepoMock();
    const sessionQueue = buildSessionQueueMock();
    const service = new SessionService(
      repo as SessionRepository,
      stateRepo,
      sessionQueue
    );

    stateRepo.getAllAnswers.mockResolvedValue({
      'participant-1': 'text:paris',
    });

    repo.findQuestionWithOptions.mockResolvedValue({
      id: 'question-1',
      questionText: 'Capital of France?',
      type: 'FILL_IN_THE_BLANK',
      timeLimit: 30,
      points: 15,
      order: 'a',
      quizId: 'quiz-1',
      options: [
        {
          id: 'opt-1',
          optionText: 'Paris',
          isCorrect: true,
          questionId: 'question-1',
        },
      ],
    });

    stateRepo.getLeaderboard.mockResolvedValue([
      { participantId: 'participant-1', score: 15 },
    ]);

    repo.findParticipantsBySession.mockResolvedValue([
      { id: 'participant-1', nickname: 'Player1', score: 0 },
    ]);

    repo.createAnswerBatch.mockResolvedValue(undefined);
    repo.findSessionWithQuestions.mockResolvedValue(
      buildSessionWithQuestions({ currentQuestionIndex: 1, questionCount: 2 })
    );

    const { result } = await service.evaluateQuestion(
      'session-1',
      'question-1'
    );

    expect(stateRepo.incrementScore).toHaveBeenCalledWith(
      'session-1',
      'participant-1',
      15
    );
    expect(result.correctAnswerText).toBe('Paris');
  });

  it('handles no answers submitted (empty Redis hash)', async () => {
    const repo = buildRepoMock();
    const stateRepo = buildStateRepoMock();
    const sessionQueue = buildSessionQueueMock();
    const service = new SessionService(
      repo as SessionRepository,
      stateRepo,
      sessionQueue
    );

    stateRepo.getAllAnswers.mockResolvedValue({});

    repo.findQuestionWithOptions.mockResolvedValue({
      id: 'question-1',
      questionText: 'Q?',
      type: 'MCQ',
      timeLimit: 30,
      points: 10,
      order: 'a',
      quizId: 'quiz-1',
      options: [
        {
          id: 'opt-correct',
          optionText: 'Correct',
          isCorrect: true,
          questionId: 'question-1',
        },
      ],
    });

    stateRepo.getLeaderboard.mockResolvedValue([]);
    repo.findParticipantsBySession.mockResolvedValue([]);
    repo.createAnswerBatch.mockResolvedValue(undefined);
    repo.findSessionWithQuestions.mockResolvedValue(
      buildSessionWithQuestions({ currentQuestionIndex: 1, questionCount: 2 })
    );

    const { result } = await service.evaluateQuestion(
      'session-1',
      'question-1'
    );

    expect(result.leaderboard).toHaveLength(0);
    expect(repo.createAnswerBatch).toHaveBeenCalledWith([]);
  });

  it('marks session ENDED after last question', async () => {
    const repo = buildRepoMock();
    const stateRepo = buildStateRepoMock();
    const sessionQueue = buildSessionQueueMock();
    const service = new SessionService(
      repo as SessionRepository,
      stateRepo,
      sessionQueue
    );

    stateRepo.getAllAnswers.mockResolvedValue({
      'participant-1': 'option-1-correct',
    });

    repo.findQuestionWithOptions.mockResolvedValue({
      id: 'question-2',
      questionText: 'Q2?',
      type: 'MCQ',
      timeLimit: 30,
      points: 10,
      order: 'b',
      quizId: 'quiz-1',
      options: [
        {
          id: 'option-1-correct',
          optionText: 'Correct',
          isCorrect: true,
          questionId: 'question-2',
        },
      ],
    });

    stateRepo.getLeaderboard.mockResolvedValue([
      { participantId: 'participant-1', score: 20 },
    ]);

    repo.findParticipantsBySession.mockResolvedValue([
      { id: 'participant-1', nickname: 'Player1', score: 0 },
    ]);

    repo.createAnswerBatch.mockResolvedValue(undefined);
    repo.updateSessionStatus.mockResolvedValue({});
    repo.updateParticipantScores.mockResolvedValue(undefined);

    // Last question: currentQuestionIndex === questionCount
    repo.findSessionWithQuestions.mockResolvedValue(
      buildSessionWithQuestions({ currentQuestionIndex: 2, questionCount: 2 })
    );

    const { result, isLastQuestion, finalLeaderboard } =
      await service.evaluateQuestion('session-1', 'question-2');

    expect(isLastQuestion).toBe(true);
    expect(finalLeaderboard).toBeDefined();
    expect(finalLeaderboard).toHaveLength(1);

    // Session marked ENDED in DB
    expect(repo.updateSessionStatus).toHaveBeenCalledWith('session-1', {
      status: SessionStatus.ENDED,
      endedAt: expect.any(Date),
    });

    // Session marked ENDED in Redis
    expect(stateRepo.setSessionEnded).toHaveBeenCalledWith('session-1');

    // Scores synced to DB
    expect(repo.updateParticipantScores).toHaveBeenCalledWith([
      { participantId: 'participant-1', score: 20 },
    ]);
  });

  it('throws QUESTION_NOT_FOUND when question missing', async () => {
    const repo = buildRepoMock();
    const stateRepo = buildStateRepoMock();
    const sessionQueue = buildSessionQueueMock();
    const service = new SessionService(
      repo as SessionRepository,
      stateRepo,
      sessionQueue
    );

    stateRepo.getAllAnswers.mockResolvedValue({});
    repo.findQuestionWithOptions.mockResolvedValue(null);

    await expect(
      service.evaluateQuestion('session-1', 'missing-question')
    ).rejects.toMatchObject({
      statusCode: statusCode.notFound,
      errorCode: ERROR_CODES.QUESTION_NOT_FOUND,
    });
  });
});
