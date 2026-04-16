import logger from '@infrastructure/logger/logger.js';
import {
  updateAnswer,
  getActiveQuestion,
} from '@infrastructure/redis/sessionState.repository.js';
import { createSessionModule } from '@modules/session/session.factory.js';
import { SocketError } from '@shared/utils/errors/socketError.js';
import type { AnswerUpdatePayload } from '@modules/session/session.dto.js';
import type { Server as SocketIOServer, Socket } from 'socket.io';

type JoinSessionPayload = {
  joinCode: string;
  nickname: string;
};

type StartSessionPayload = {
  sessionId: string;
};

type QuestionNextPayload = {
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
  // ─── Join Session ──────────────────────────────────────────────────────────

  socket.on('session:join', async (payload: JoinSessionPayload) => {
    const { joinCode, nickname } = payload;
    const authenticatedUserId = getAuthenticatedUserId(socket);

    try {
      const result = await sessionService.joinSession({ joinCode, nickname });

      socket.join(result.sessionId);

      // Store participant context on socket for answer:update
      socket.data.participantId = result.participant.id;
      socket.data.sessionId = result.sessionId;

      io.to(result.sessionId).emit('player:joined', {
        participant: result.participant,
      });

      logger.info(
        {
          socketId: socket.id,
          sessionId: result.sessionId,
          participantId: result.participant.id,
          nickname,
        },
        'Player joined session'
      );
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

      SocketError(socket, 'session:join', error);
    }
  });

  // ─── Host Joins Room (Lobby Phase) ───────────────────────────────────────

  socket.on('session:host-join', async (payload: { sessionId: string }) => {
    const authenticatedUserId = getAuthenticatedUserId(socket);
    if (!authenticatedUserId) {
      socket.emit('error:session', {
        event: 'session:host-join',
        message: 'Unauthorized',
      });
      return;
    }

    const { sessionId } = payload;

    socket.join(sessionId);
    socket.data.sessionId = sessionId;

    logger.info(
      { socketId: socket.id, sessionId, hostUserId: authenticatedUserId },
      'Host joined session room (lobby)'
    );

    socket.emit('session:host-joined', { sessionId });
  });

  // ─── Start Session ─────────────────────────────────────────────────────────

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

      // Host joins the session room so they receive all broadcasts
      socket.join(startedSession.id);
      socket.data.sessionId = startedSession.id;

      io.to(startedSession.id).emit('session:started', {
        sessionId: startedSession.id,
      });

      logger.info(
        {
          socketId: socket.id,
          sessionId: startedSession.id,
          hostUserId: authenticatedUserId,
        },
        'Host started session'
      );
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

      SocketError(socket, 'session:start', error);
    }
  });

  // ─── Advance to Next Question (Host only) ──────────────────────────────────

  socket.on('question:next', async (payload: QuestionNextPayload) => {
    const authenticatedUserId = getAuthenticatedUserId(socket);
    if (!authenticatedUserId) {
      logger.warn(
        { socketId: socket.id },
        'Unauthorized question:next attempt'
      );
      socket.emit('error:session', {
        event: 'question:next',
        message: 'Unauthorized',
      });
      return;
    }

    const { sessionId } = payload;

    try {
      const questionPayload = await sessionService.advanceQuestion(sessionId);

      io.to(sessionId).emit('question:started', questionPayload);

      logger.info(
        {
          sessionId,
          questionId: questionPayload.question.id,
          questionIndex: questionPayload.questionIndex,
        },
        'Question advanced'
      );
    } catch (error) {
      logger.warn(
        {
          socketId: socket.id,
          authenticatedUserId,
          payload: { sessionId },
          err: error,
        },
        'question:next handler failed'
      );

      SocketError(socket, 'question:next', error);
    }
  });

  // ─── Update Answer (During Timer) ──────────────────────────────────────────

  socket.on(
    'answer:update',
    async (payload: Omit<AnswerUpdatePayload, 'participantId'>) => {
      const participantId =
        (socket.data.participantId as string) ?? payload.sessionId;

      if (!participantId || !socket.data.sessionId) {
        socket.emit('error:session', {
          event: 'answer:update',
          message: 'Not joined to a session',
        });
        return;
      }

      const sessionId = socket.data.sessionId as string;
      const { questionId, optionId, answerText } = payload;

      try {
        // Validate that the question timer hasn't expired
        const activeQuestion = await getActiveQuestion(sessionId);
        if (!activeQuestion || activeQuestion.activeQuestionId !== questionId) {
          socket.emit('error:session', {
            event: 'answer:update',
            message: 'No active question or question mismatch',
          });
          return;
        }

        if (Date.now() > activeQuestion.questionEndsAt) {
          socket.emit('error:session', {
            event: 'answer:update',
            message: 'Question timer has expired',
          });
          return;
        }

        // Determine the value to store in Redis
        let value: string;
        if (answerText !== undefined && answerText !== null) {
          value = `text:${answerText}`;
        } else if (optionId) {
          value = optionId;
        } else {
          socket.emit('error:session', {
            event: 'answer:update',
            message: 'Either optionId or answerText is required',
          });
          return;
        }

        // Overwrite in Redis (no evaluation, no DB hit)
        await updateAnswer(sessionId, questionId, participantId, value);
      } catch (error) {
        logger.warn(
          {
            socketId: socket.id,
            participantId,
            sessionId,
            questionId,
            err: error,
          },
          'answer:update handler failed'
        );

        SocketError(socket, 'answer:update', error);
      }
    }
  );
};
