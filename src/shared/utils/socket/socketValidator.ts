import { z } from 'zod';
import type { Server as SocketIOServer, Socket } from 'socket.io';
import logger from '@infrastructure/logger/logger.js';
import { ERROR_CODES } from '../errors/errorCodes.js';
import { statusCode } from '../http/statusCodes.js';
import { emitSocketError } from '../errors/socketError.js';
import { type ClientToServerEventKey, SOCKET_EVENTS } from './socketEvents.js';
import type {
  SocketErrorPayload,
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from './socketTypes.js';

/** Fully-typed socket for use in validators. */
export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/** Fully-typed Socket.IO server. */
export type AppServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type SocketContext = {
  event: (typeof SOCKET_EVENTS)[ClientToServerEventKey];
  socketId: string;
  authenticatedUserId: string | null;
};

/**
 * Validates an incoming socket payload against a Zod schema.
 *
 * On validation failure, emits a unified error via emitSocketError() and logs
 * the validation issue — the handler should bail out immediately afterwards.
 *
 * @returns The parsed (and potentially transformed) data on success, or `null`
 *          if validation failed.
 */
export const parseSocketPayload = <T extends z.ZodTypeAny>(
  socket: AppSocket,
  schema: T,
  data: unknown,
  context: SocketContext
): z.infer<T> | null => {
  const result = schema.safeParse(data);

  if (result.success) {
    return result.data as z.infer<T>;
  }

  const errorPayload: SocketErrorPayload = {
    statusCode: statusCode.badRequest,
    errorCode: ERROR_CODES.VALIDATION_ERROR,
    message: result.error.issues.map(i => i.message).join('; '),
    details: result.error.issues,
  };

  emitSocketError(socket, context.event, errorPayload);

  logger.warn(
    {
      socketId: context.socketId,
      event: context.event,
      authenticatedUserId: context.authenticatedUserId,
      validationErrors: result.error.issues,
    },
    `${context.event}: payload validation failed`
  );

  return null;
};

/**
 * Helper to get authenticated user ID from socket data.
 */
export const getAuthenticatedUserId = (socket: AppSocket): string | null => {
  const userId = socket.data.userId;
  return typeof userId === 'string' && userId.length > 0 ? userId : null;
};
