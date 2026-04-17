import type { Participant, Session } from '@generated/prisma/client.js';
import type {
  CreateSessionInputDto,
  JoinSessionInputDto,
} from './session.schema.js';

export type CreateSessionDto = CreateSessionInputDto & { hostId: string };
export type JoinSessionDto = JoinSessionInputDto;

export type SessionResponseDto = Session & {
  joinCode: string;
};

export type JoinSessionResponseDto = {
  sessionId: string;
  participant: Participant;
};
