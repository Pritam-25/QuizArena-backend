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

const getAuthenticatedUserId = (socket: Socket) => {
  const userId = socket.data.userId;
  return typeof userId === 'string' && userId.length > 0 ? userId : null;
};

/**
 * Registers session-scoped Socket.IO handlers for a newly connected socket.
 */
export const registerSessionSocketHandlers = (
  io: SocketIOServer,
  socket: Socket
) => {
  socket.on('session:join', async (payload: JoinSessionPayload) => {
    const { joinCode, nickname } = payload;
    const authenticatedUserId = getAuthenticatedUserId(socket);

    try {
      const result = await sessionService.joinSession({ joinCode, nickname });

      socket.join(result.sessionId);

      io.to(result.sessionId).emit('player:joined', {
        participant: result.participant,
      });
    } catch (error) {
      logger.warn(
        {
          socketId: socket.id,
          actorType: authenticatedUserId ? 'authenticated' : 'guest',
          authenticatedUserId,
          payload: { joinCode, nickname },
          err: error,
        },
        'session:join handler failed'
      );
    }
  });

  socket.on('session:start', async (payload: StartSessionPayload) => {
    const authenticatedUserId = getAuthenticatedUserId(socket);
    if (!authenticatedUserId) {
      logger.warn(
        { socketId: socket.id },
        'Unauthorized session:start attempt'
      );
      return;
    }

    const { sessionId } = payload;

    try {
      const startedSession = await sessionService.startSession(sessionId);

      io.to(startedSession.id).emit('session:started', {
        sessionId: startedSession.id,
      });
    } catch (error) {
      logger.warn(
        {
          socketId: socket.id,
          authenticatedUserId,
          payload: { sessionId },
          err: error,
        },
        'session:start handler failed'
      );
    }
  });
};
