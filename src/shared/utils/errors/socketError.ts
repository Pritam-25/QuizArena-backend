import type { Socket } from 'socket.io';
import { buildErrorResponse } from '../http/apiResponses.js';
import {
  type ClientToServerEventKey,
  SOCKET_EVENTS,
} from '../socket/socketEvents.js';

export const emitSocketError = (
  socket: Pick<Socket, 'emit'>,
  eventName: (typeof SOCKET_EVENTS)[ClientToServerEventKey],
  error: unknown,
  callback?: (response: any) => void
) => {
  const response = buildErrorResponse(error, { event: eventName });

  if (callback) {
    return callback(response);
  }

  socket.emit(`${eventName}:error`, response);
  socket.emit('socket:error', response);
};

export const SocketError = emitSocketError;
