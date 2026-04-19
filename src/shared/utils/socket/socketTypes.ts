import { SOCKET_EVENTS } from './socketEvents.js';
import type { ErrorContract } from '../errors/errorContract.js';

// ─── Re-usable payload shapes ─────────────────────────────────────────────────

/**
 * Socket error payload - extends the shared ErrorContract type.
 * Used for all socket error responses.
 */
export type SocketErrorPayload = ErrorContract;

export interface ParticipantPayload {
  id: string;
  sessionId: string;
  nickname: string;
}

// ─── Server → Client events ───────────────────────────────────────────────────

// `type` (not `interface`) is required — TypeScript only allows computed keys
// from `as const` objects in type aliases, not in interface declarations.
export type ServerToClientEvents = {
  // Connection lifecycle
  [SOCKET_EVENTS.SOCKET_READY]: (payload: { userId: string | null }) => void;
  [SOCKET_EVENTS.SOCKET_ERROR]: (payload: SocketErrorPayload) => void;

  // Session
  [SOCKET_EVENTS.SESSION_STARTED]: (payload: { sessionId: string }) => void;
  [SOCKET_EVENTS.PLAYER_JOINED]: (payload: {
    participant: ParticipantPayload;
  }) => void;
  [SOCKET_EVENTS.SESSION_HOST_JOINED]: (
    payload: Record<string, unknown>
  ) => void;

  // Question
  [SOCKET_EVENTS.QUESTION_STARTED]: (payload: Record<string, unknown>) => void;
  [SOCKET_EVENTS.QUESTION_ENDED]: (payload: Record<string, unknown>) => void;

  // Leaderboard
  [SOCKET_EVENTS.LEADERBOARD_UPDATE]: (
    payload: Record<string, unknown>
  ) => void;
};

// ─── Client → Server events ───────────────────────────────────────────────────

export type ClientToServerEvents = {
  [SOCKET_EVENTS.SESSION_JOIN]: (payload: {
    joinCode: string;
    nickname: string;
  }) => void;

  [SOCKET_EVENTS.SESSION_HOST_JOIN]: (payload: { sessionId: string }) => void;

  [SOCKET_EVENTS.SESSION_START]: (payload: { sessionId: string }) => void;

  [SOCKET_EVENTS.QUESTION_NEXT]: (payload: { sessionId: string }) => void;

  [SOCKET_EVENTS.ANSWER_UPDATE]: (payload: {
    questionId: string;
    optionId?: string;
    answerText?: string;
  }) => void;
};

// ─── Inter-server events (used by Redis adapter) ──────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InterServerEvents {}

// ─── Per-socket data ──────────────────────────────────────────────────────────

export interface SocketData {
  /** Set by socketAuthMiddleware when a valid JWT is present. */
  userId?: string;
}
