export { SOCKET_EVENTS } from './socketEvents.js';
export type { SocketEventName } from './socketEvents.js';

export {
  sessionJoinSchema,
  sessionHostJoinSchema,
  sessionStartSchema,
  questionNextSchema,
  answerUpdateSchema,
  CLIENT_EVENT_SCHEMAS,
} from './socketSchemas.js';
export type {
  SessionJoinPayload,
  SessionHostJoinPayload,
  SessionStartPayload,
  QuestionNextPayload,
  AnswerUpdatePayload,
} from './socketSchemas.js';

export type {
  SocketErrorPayload,
  ParticipantPayload,
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from './socketTypes.js';

export {
  parseSocketPayload,
  getAuthenticatedUserId,
} from './socketValidator.js';

export type { AppSocket, AppServer, SocketContext } from './socketValidator.js';
