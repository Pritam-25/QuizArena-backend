import logger from '@infrastructure/logger/logger.js';
import { SocketError } from '@shared/utils/errors/socketError.js';
import { ApiError, ERROR_CODES } from '@shared/utils/errors/index.js';
import { statusCode } from '@shared/utils/http/statusCodes.js';
import type { SessionService } from './session.service.js';
import type { AnswerUpdatePayload } from './session.dto.js';
import type { Server as SocketIOServer, Socket } from 'socket.io';

// ─── Payload Types ────────────────────────────────────────────────────────────

type JoinSessionPayload = {
  joinCode: string;
  nickname: string;
};

type HostJoinPayload = {
  sessionId: string;
};

type StartSessionPayload = {
  sessionId: string;
};

type QuestionNextPayload = {
  sessionId: string;
};

// ─── Handler Class ────────────────────────────────────────────────────────────

/**
 * Registers session-scoped Socket.IO event handlers for connected sockets.
 *
 * `io` and `sessionService` are injected once at construction time.
 * For each new connection, call `handler.register(socket)` to attach all
 * session event listeners to that socket.
 *
 * This class contains zero infrastructure imports — all business logic is
 * delegated to `sessionService`.
 */
export class SessionSocketHandler {
  constructor(
    private readonly io: SocketIOServer,
    private readonly sessionService: SessionService
  ) {}

  /**
   * Attaches all session event listeners to the given socket.
   * Called once per connection from `socketServer.ts`.
   */
  register(socket: Socket): void {
    socket.on('session:join', (payload: JoinSessionPayload) =>
      this.onJoinSession(socket, payload)
    );
    socket.on('session:host-join', (payload: HostJoinPayload) =>
      this.onHostJoin(socket, payload)
    );
    socket.on('session:start', (payload: StartSessionPayload) =>
      this.onStartSession(socket, payload)
    );
    socket.on('question:next', (payload: QuestionNextPayload) =>
      this.onQuestionNext(socket, payload)
    );
    socket.on(
      'answer:update',
      (payload: Omit<AnswerUpdatePayload, 'participantId'>) =>
        this.onAnswerUpdate(socket, payload)
    );
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private getAuthenticatedUserId(socket: Socket): string | null {
    const userId = socket.data.userId;
    return typeof userId === 'string' && userId.length > 0 ? userId : null;
  }

  // ─── Event Handlers ──────────────────────────────────────────────────────────

  // ─── Join Session ───────────────────────────────────────────────────────────

  private async onJoinSession(
    socket: Socket,
    payload: JoinSessionPayload
  ): Promise<void> {
    const { joinCode, nickname } = payload;
    const authenticatedUserId = this.getAuthenticatedUserId(socket);

    try {
      const result = await this.sessionService.joinSession({
        joinCode,
        nickname,
      });

      socket.join(result.sessionId);

      // Store participant context on socket for answer:update
      socket.data.participantId = result.participant.id;
      socket.data.sessionId = result.sessionId;

      this.io.to(result.sessionId).emit('player:joined', {
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
  }

  // ─── Host Joins Room (Lobby Phase) ──────────────────────────────────────────

  private async onHostJoin(
    socket: Socket,
    payload: HostJoinPayload
  ): Promise<void> {
    const authenticatedUserId = this.getAuthenticatedUserId(socket);
    if (!authenticatedUserId) {
      SocketError(
        socket,
        'session:host-join',
        new ApiError(statusCode.unauthorized, ERROR_CODES.UNAUTHORIZED)
      );
      return;
    }

    const { sessionId } = payload;

    try {
      // Fetch current participant list so the host sees who's already in the lobby
      const participants =
        await this.sessionService.getSessionParticipants(sessionId);

      socket.join(sessionId);
      socket.data.sessionId = sessionId;

      logger.info(
        { socketId: socket.id, sessionId, hostUserId: authenticatedUserId },
        'Host joined session room (lobby)'
      );

      socket.emit('session:host-joined', { sessionId, participants });
    } catch (error) {
      logger.warn(
        {
          socketId: socket.id,
          sessionId,
          hostUserId: authenticatedUserId,
          err: error,
        },
        'session:host-join handler failed'
      );

      SocketError(socket, 'session:host-join', error);
    }
  }

  // ─── Start Session ───────────────────────────────────────────────────────────

  private async onStartSession(
    socket: Socket,
    payload: StartSessionPayload
  ): Promise<void> {
    const authenticatedUserId = this.getAuthenticatedUserId(socket);
    if (!authenticatedUserId) {
      logger.warn(
        { socketId: socket.id },
        'Unauthorized session:start attempt'
      );
      SocketError(
        socket,
        'session:start',
        new ApiError(statusCode.unauthorized, ERROR_CODES.UNAUTHORIZED)
      );
      return;
    }

    const { sessionId } = payload;

    try {
      const startedSession = await this.sessionService.startSession(sessionId);

      // Host joins the session room so they receive all broadcasts
      socket.join(startedSession.id);
      socket.data.sessionId = startedSession.id;

      this.io.to(startedSession.id).emit('session:started', {
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
  }

  // ─── Advance to Next Question (Host only) ────────────────────────────────────

  private async onQuestionNext(
    socket: Socket,
    payload: QuestionNextPayload
  ): Promise<void> {
    const authenticatedUserId = this.getAuthenticatedUserId(socket);
    if (!authenticatedUserId) {
      logger.warn(
        { socketId: socket.id },
        'Unauthorized question:next attempt'
      );
      SocketError(
        socket,
        'question:next',
        new ApiError(statusCode.unauthorized, ERROR_CODES.UNAUTHORIZED)
      );
      return;
    }

    const { sessionId } = payload;

    try {
      const questionPayload =
        await this.sessionService.advanceQuestion(sessionId);

      this.io.to(sessionId).emit('question:started', questionPayload);

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
  }

  // ─── Submit Answer (During Timer) ────────────────────────────────────────────

  private async onAnswerUpdate(
    socket: Socket,
    payload: Omit<AnswerUpdatePayload, 'participantId'>
  ): Promise<void> {
    const participantId = socket.data.participantId as string | undefined;
    const sessionId = socket.data.sessionId as string | undefined;

    if (!participantId || !sessionId) {
      SocketError(
        socket,
        'answer:update',
        new ApiError(statusCode.badRequest, ERROR_CODES.NOT_IN_SESSION)
      );
      return;
    }

    const { questionId, optionId, answerText } = payload;

    try {
      // All validation (active question, timer, payload) lives in the service
      await this.sessionService.submitAnswer({
        sessionId,
        participantId,
        questionId,
        ...(optionId !== undefined && { optionId }),
        ...(answerText !== undefined && { answerText }),
      });
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
}
