import type { Socket } from 'socket.io';
import { buildErrorResponse } from '../http/apiResponses.js';

export const emitSocketError = (
  socket: Pick<Socket, 'emit'>,
  eventName: string,
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
