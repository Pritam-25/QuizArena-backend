/**
 * Typed Socket.IO event interfaces for the quiz application.
 *
 * - `ClientToServerEvents` — events the client sends to the server.
 * - `ServerToClientEvents` — events the server sends to the client.
 * - `SocketData`           — per-connection data attached to `socket.data`.
 *
 * Keep in sync with `frontend/lib/socket/socketTypes.ts`.
 */

import type { ErrorContract } from '@shared/utils/errors/errorContract.js';

// ─── Shared Payloads ─────────────────────────────────────────────────────────

/** Emitted on every successful connection. `userId` is null for guests. */
export interface SocketReadyPayload {
  userId: string | null;
}

/** Re-uses the existing normalised error contract shape. */
export type SocketErrorPayload = Pick<
  ErrorContract,
  'statusCode' | 'errorCode' | 'message'
> &
  Partial<Pick<ErrorContract, 'details'>>;

// ─── Events: Client → Server ─────────────────────────────────────────────────

export interface ClientToServerEvents {
  'session:join': (payload: { joinCode: string; nickname: string }) => void;
  'session:host-join': (payload: { sessionId: string }) => void;
  'session:start': (payload: { sessionId: string }) => void;
  'question:next': (payload: { sessionId: string }) => void;
  'answer:update': (payload: {
    questionId: string;
    optionId?: string;
    answerText?: string;
  }) => void;
}

// ─── Events: Server → Client ─────────────────────────────────────────────────

export interface ServerToClientEvents {
  // ── Connection lifecycle ─────────────────────────────────────────────────
  'socket:ready': (payload: SocketReadyPayload) => void;
  'socket:error': (payload: SocketErrorPayload) => void;

  // ── Session events ───────────────────────────────────────────────────────
  'player:joined': (payload: Record<string, unknown>) => void;
  'session:host-joined': (payload: Record<string, unknown>) => void;
  'session:started': (payload: { sessionId: string }) => void;

  // ── Question events ──────────────────────────────────────────────────────
  'question:started': (payload: Record<string, unknown>) => void;
  'question:ended': (payload: Record<string, unknown>) => void;

  // ── Leaderboard / scoring ────────────────────────────────────────────────
  'leaderboard:update': (payload: Record<string, unknown>) => void;

  // ── Per-event error pattern emitted by emitSocketError() ────────────────
  'session:join:error': (payload: SocketErrorPayload) => void;
  'session:host-join:error': (payload: SocketErrorPayload) => void;
  'session:start:error': (payload: SocketErrorPayload) => void;
  'question:next:error': (payload: SocketErrorPayload) => void;
  'answer:update:error': (payload: SocketErrorPayload) => void;
}

// ─── Inter-server Events ─────────────────────────────────────────────────────

// Unused for now; kept for completeness when Redis adapter scales up.
export interface InterServerEvents {}

// ─── Per-connection Socket Data ───────────────────────────────────────────────

/** Data stored on `socket.data` after the auth middleware and event handlers run. */
export interface SocketData {
  /** Populated by socketAuthMiddleware when a valid JWT is present. */
  userId?: string;
  /** Set by session:join — links the socket to a participant row. */
  participantId?: string;
  /** Set by session:join / session:host-join — the active session room. */
  sessionId?: string;
}
