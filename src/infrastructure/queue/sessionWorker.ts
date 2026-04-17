import { Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import type { Server as SocketIOServer } from 'socket.io';
import logger from '@infrastructure/logger/logger.js';
import type { SessionService } from '@modules/session/session.service.js';

type EvaluateQuestionData = {
  sessionId: string;
  questionId: string;
};

/**
 * BullMQ worker that processes delayed question-evaluation jobs.
 *
 * Dependencies are injected via constructor so the worker can be started
 * after Socket.IO is initialized and the session service is wired.
 */
export class SessionWorker {
  private worker: Worker | null = null;

  /**
   * @param sessionService - Injected session service (evaluates questions)
   * @param getIo          - Lazy getter for the Socket.IO server (avoids circular init)
   * @param redis          - Shared ioredis client for the BullMQ connection
   */
  constructor(
    private readonly sessionService: SessionService,
    private readonly getIo: () => SocketIOServer,
    private readonly redis: Redis
  ) {}

  /**
   * Starts the BullMQ worker. Safe to call once during server bootstrap.
   * Subsequent calls are no-ops and return the existing worker.
   */
  start(): Worker {
    if (this.worker) {
      logger.warn('Session worker already running, skipping duplicate start');
      return this.worker;
    }

    this.worker = new Worker<EvaluateQuestionData>(
      'session',
      async job => {
        if (job.name !== 'evaluate-question') {
          logger.warn({ jobName: job.name }, 'Unknown session job type');
          return;
        }

        const { sessionId, questionId } = job.data;

        logger.info(
          { sessionId, questionId, jobId: job.id },
          'Processing question evaluation'
        );

        try {
          const { result, isLastQuestion, finalLeaderboard } =
            await this.sessionService.evaluateQuestion(sessionId, questionId);

          const io = this.getIo();

          // Broadcast correct answer + leaderboard to all participants
          io.to(sessionId).emit('question:ended', result);

          if (isLastQuestion && finalLeaderboard) {
            io.to(sessionId).emit('session:ended', { finalLeaderboard });
            logger.info({ sessionId }, 'Session ended after last question');
          }

          logger.info(
            {
              sessionId,
              questionId,
              answersEvaluated: result.leaderboard.length,
              isLastQuestion,
            },
            'Question evaluation completed'
          );
        } catch (error) {
          logger.error(
            { sessionId, questionId, err: error },
            'Failed to evaluate question'
          );
          throw error; // Let BullMQ retry
        }
      },
      { connection: this.redis, concurrency: 5 }
    );

    this.worker.on('failed', (job, error) => {
      logger.error(
        { jobId: job?.id, jobName: job?.name, err: error },
        'Session worker job failed'
      );
    });

    this.worker.on('error', (error: Error) => {
      logger.error({ err: error }, 'Session worker error');
    });

    logger.info('Session worker started');
    return this.worker;
  }

  /**
   * Gracefully shuts down the BullMQ worker.
   */
  async stop(): Promise<void> {
    if (!this.worker) return;

    await this.worker.close();
    this.worker = null;
    logger.info('Session worker stopped');
  }
}
