import type { Participant, Session } from '@generated/prisma/client.js';
import type {
  CreateSessionInputDto,
  JoinSessionInputDto,
} from './session.schema.js';

// ─── Input DTOs ──────────────────────────────────────────────────────────────

export type CreateSessionDto = CreateSessionInputDto & { hostId: string };
export type JoinSessionDto = JoinSessionInputDto;

// ─── Response DTOs ───────────────────────────────────────────────────────────

export type SessionResponseDto = Session & {
  joinCode: string;
};

export type JoinSessionResponseDto = {
  sessionId: string;
  participant: Participant;
};

// ─── Real-Time Answer DTOs ───────────────────────────────────────────────────

export type AnswerUpdatePayload = {
  sessionId: string;
  questionId: string;
  participantId: string;
  optionId?: string;
  answerText?: string;
};

export type QuestionStartedPayload = {
  question: {
    id: string;
    questionText: string;
    type: string;
    timeLimit: number;
    options: { id: string; optionText: string }[];
  };
  questionIndex: number;
  totalQuestions: number;
};

export type LeaderboardEntry = {
  participantId: string;
  nickname: string;
  score: number;
  rank: number;
};

export type QuestionEndedPayload = {
  correctOptionId: string | null;
  correctAnswerText: string | null;
  leaderboard: LeaderboardEntry[];
};

export type SessionEndedPayload = {
  finalLeaderboard: LeaderboardEntry[];
};
