import type { Server as SocketIOServer, Socket } from 'socket.io';
import logger from '@infrastructure/logger/logger.js';
import { createSessionModule } from './session.factory.js';
import {
  SOCKET_EVENTS,
  answerUpdateSchema,
  questionNextSchema,
  sessionHostJoinSchema,
  sessionJoinSchema,
  sessionStartSchema,
  getAuthenticatedUserId,
  parseSocketPayload,
  type AppServer,
  type AppSocket,
  type SocketContext,
} from '@shared/utils/socket/index.js';

const { service: sessionService } = createSessionModule();

/**
 * Registers session-scoped Socket.IO handlers for a newly connected socket.
 */
export const registerSessionSocketHandlers = (
  io: AppServer,
  socket: AppSocket
) => {
  // ── session:join ────────────────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.SESSION_JOIN, async raw => {
    const authenticatedUserId = getAuthenticatedUserId(socket);
    const ctx: SocketContext = {
      event: SOCKET_EVENTS.SESSION_JOIN,
      socketId: socket.id,
      authenticatedUserId,
    };

    const payload = parseSocketPayload(socket, sessionJoinSchema, raw, ctx);
    if (!payload) return;

    const { joinCode, nickname } = payload;

    try {
      const result = await sessionService.joinSession({ joinCode, nickname });

      socket.join(result.sessionId);

      io.to(result.sessionId).emit(SOCKET_EVENTS.PLAYER_JOINED, {
        participant: result.participant,
      });
    } catch (error) {
      logger.warn(
        { ...ctx, payload: { joinCode, nickname }, err: error },
        `${SOCKET_EVENTS.SESSION_JOIN} handler failed`
      );
    }
  });

  // ── session:host-join ───────────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.SESSION_HOST_JOIN, async raw => {
    const authenticatedUserId = getAuthenticatedUserId(socket);
    const ctx: SocketContext = {
      event: SOCKET_EVENTS.SESSION_HOST_JOIN,
      socketId: socket.id,
      authenticatedUserId,
    };

    if (!authenticatedUserId) {
      logger.warn(
        ctx,
        `Unauthorized ${SOCKET_EVENTS.SESSION_HOST_JOIN} attempt`
      );
      return;
    }

    const payload = parseSocketPayload(socket, sessionHostJoinSchema, raw, ctx);
    if (!payload) return;

    const { sessionId } = payload;
    socket.join(sessionId);

    io.to(sessionId).emit(SOCKET_EVENTS.SESSION_HOST_JOINED, {
      hostId: authenticatedUserId,
    });
  });

  // ── session:start ───────────────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.SESSION_START, async raw => {
    const authenticatedUserId = getAuthenticatedUserId(socket);
    const ctx: SocketContext = {
      event: SOCKET_EVENTS.SESSION_START,
      socketId: socket.id,
      authenticatedUserId,
    };

    if (!authenticatedUserId) {
      logger.warn(ctx, `Unauthorized ${SOCKET_EVENTS.SESSION_START} attempt`);
      return;
    }

    const payload = parseSocketPayload(socket, sessionStartSchema, raw, ctx);
    if (!payload) return;

    const { sessionId } = payload;

    try {
      const startedSession = await sessionService.startSession(sessionId);

      io.to(startedSession.id).emit(SOCKET_EVENTS.SESSION_STARTED, {
        sessionId: startedSession.id,
      });
    } catch (error) {
      logger.warn(
        { ...ctx, payload: { sessionId }, err: error },
        `${SOCKET_EVENTS.SESSION_START} handler failed`
      );
    }
  });

  // ── question:next ───────────────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.QUESTION_NEXT, async raw => {
    const authenticatedUserId = getAuthenticatedUserId(socket);
    const ctx: SocketContext = {
      event: SOCKET_EVENTS.QUESTION_NEXT,
      socketId: socket.id,
      authenticatedUserId,
    };

    if (!authenticatedUserId) {
      logger.warn(ctx, `Unauthorized ${SOCKET_EVENTS.QUESTION_NEXT} attempt`);
      return;
    }

    const payload = parseSocketPayload(socket, questionNextSchema, raw, ctx);
    if (!payload) return;

    // TODO: implement questionService.advanceQuestion(payload.sessionId)
    logger.info(
      { ...ctx, sessionId: payload.sessionId },
      `${SOCKET_EVENTS.QUESTION_NEXT} received — handler not yet implemented`
    );
  });

  // ── answer:update ───────────────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.ANSWER_UPDATE, async raw => {
    const authenticatedUserId = getAuthenticatedUserId(socket);
    const ctx: SocketContext = {
      event: SOCKET_EVENTS.ANSWER_UPDATE,
      socketId: socket.id,
      authenticatedUserId,
    };

    const payload = parseSocketPayload(socket, answerUpdateSchema, raw, ctx);
    if (!payload) return;

    // TODO: implement answerService.submitAnswer(payload)
    logger.info(
      { ...ctx, questionId: payload.questionId },
      `${SOCKET_EVENTS.ANSWER_UPDATE} received — handler not yet implemented`
    );
  });
};
