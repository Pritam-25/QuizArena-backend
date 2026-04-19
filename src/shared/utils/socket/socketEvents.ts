/**
 * Canonical Socket.IO event name constants.
 *
 * ⚠️  Keep in sync with frontend `lib/socket/socketEvents.ts`.
 *     Both files must stay identical since the repos are separate.
 */
export const SOCKET_EVENTS = {
  // ── Connection lifecycle ──────────────────────────────────────────────────
  /** Emitted by the server once per connection after auth resolves. */
  SOCKET_READY: 'socket:ready',
  /** Emitted by the server when a connection-level or auth error occurs. */
  SOCKET_ERROR: 'socket:error',

  // ── Session ───────────────────────────────────────────────────────────────
  /** Client → Server: participant requests to join a session via join code. */
  SESSION_JOIN: 'session:join',
  /** Client → Server: host joins the session room after creating a session. */
  SESSION_HOST_JOIN: 'session:host-join',
  /** Client → Server: host starts the session. */
  SESSION_START: 'session:start',
  /** Server → Client: broadcast when a session transitions to ACTIVE. */
  SESSION_STARTED: 'session:started',

  // ── Players ───────────────────────────────────────────────────────────────
  /** Server → Client: broadcast when a new participant joins the lobby. */
  PLAYER_JOINED: 'player:joined',
  /** Server → Client: broadcast when the host joins the session room. */
  SESSION_HOST_JOINED: 'session:host-joined',

  // ── Question ──────────────────────────────────────────────────────────────
  /** Client → Server: host advances to the next question. */
  QUESTION_NEXT: 'question:next',
  /** Server → Client: broadcast when a new question begins. */
  QUESTION_STARTED: 'question:started',
  /** Server → Client: broadcast when the current question ends. */
  QUESTION_ENDED: 'question:ended',

  // ── Answer ────────────────────────────────────────────────────────────────
  /** Client → Server: participant submits / updates their answer. */
  ANSWER_UPDATE: 'answer:update',

  // ── Leaderboard ───────────────────────────────────────────────────────────
  /** Server → Client: leaderboard snapshot after scoring. */
  LEADERBOARD_UPDATE: 'leaderboard:update',
} as const;

/** Union of every socket event name string. */
export type SocketEventName =
  (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

/** Union of client-to-server event keys only (for typed error handling). */
export type ClientToServerEventKey =
  | 'SESSION_JOIN'
  | 'SESSION_HOST_JOIN'
  | 'SESSION_START'
  | 'QUESTION_NEXT'
  | 'ANSWER_UPDATE';
