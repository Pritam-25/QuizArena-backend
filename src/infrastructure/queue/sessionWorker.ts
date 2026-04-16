import { Worker } from 'bullmq';
import { redis } from '@infrastructure/redis/redisClient.js';
import { getSocketServer } from '@infrastructure/socket/socketServer.js';
import logger from '@infrastructure/logger/logger.js';
import { createSessionModule } from '@modules/session/session.factory.js';

type EvaluateQuestionData = {
  sessionId: string;
  questionId: string;
};

let sessionWorker: Worker | null = null;

/**
 * Starts the BullMQ session worker that processes delayed evaluation jobs.
 *
 * Should be called once during server startup, after Socket.IO is initialized.
 */
export function startSessionWorker() {
  if (sessionWorker) {
    logger.warn('Session worker already running, skipping duplicate start');
    return sessionWorker;
  }

  const { service: sessionService } = createSessionModule();

  sessionWorker = new Worker<EvaluateQuestionData>(
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
          await sessionService.evaluateQuestion(sessionId, questionId);

        const io = getSocketServer();

        // Broadcast correct answer + leaderboard to all participants
        io.to(sessionId).emit('question:ended', result);

        if (isLastQuestion && finalLeaderboard) {
          io.to(sessionId).emit('session:ended', {
            finalLeaderboard,
          });

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
    {
      connection: redis,
      concurrency: 5,
    }
  );

  sessionWorker.on('failed', (job, error) => {
    logger.error(
      { jobId: job?.id, jobName: job?.name, err: error },
      'Session worker job failed'
    );
  });

  sessionWorker.on('error', (error: Error) => {
    logger.error({ err: error }, 'Session worker error');
  });

  logger.info('Session worker started');
  return sessionWorker;
}

/**
 * Gracefully shuts down the session worker.
 */
export async function stopSessionWorker() {
  if (!sessionWorker) return;

  await sessionWorker.close();
  sessionWorker = null;
  logger.info('Session worker stopped');
}
