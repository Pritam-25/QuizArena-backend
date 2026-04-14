import logger from '@infrastructure/logger/logger.js';
import { createSessionModule } from '@modules/session/session.factory.js';
import type { Server as SocketIOServer, Socket } from 'socket.io';

type JoinSessionPayload = {
  joinCode: string;
  nickname: string;
};

type StartSessionPayload = {
  sessionId: string;
};

const { service: sessionService } = createSessionModule();

/**
 * Registers session-scoped Socket.IO handlers for a newly connected socket.
 */
export const registerSessionSocketHandlers = (
  io: SocketIOServer,
  socket: Socket
) => {
  socket.on('session:join', async (payload: JoinSessionPayload) => {
    try {
      const result = await sessionService.joinSession(payload);

      socket.join(result.sessionId);

      io.to(result.sessionId).emit('player:joined', {
        participant: result.participant,
      });
    } catch (error) {
      logger.warn(
        {
          socketId: socket.id,
          payload,
          err: error,
        },
        'session:join handler failed'
      );
    }
  });

  socket.on('session:start', async (payload: StartSessionPayload) => {
    try {
      const startedSession = await sessionService.startSession(
        payload.sessionId
      );

      io.to(startedSession.id).emit('session:started', {
        sessionId: startedSession.id,
      });
    } catch (error) {
      logger.warn(
        {
          socketId: socket.id,
          payload,
          err: error,
        },
        'session:start handler failed'
      );
    }
  });
};
