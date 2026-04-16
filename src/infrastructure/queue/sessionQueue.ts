import { Queue } from 'bullmq';
import { redis } from '@infrastructure/redis/redisClient.js';
import logger from '@infrastructure/logger/logger.js';

/**
 * BullMQ queue for session-related delayed/scheduled jobs.
 *
 * Uses the shared ioredis singleton so no extra connection is needed.
 */
export const sessionQueue = new Queue('session', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1_000 },
    removeOnComplete: true,
    removeOnFail: { count: 50 },
  },
});

sessionQueue.on('error', (error: Error) => {
  logger.error({ err: error }, 'Session queue error');
});

// ─── Job Schedulers ──────────────────────────────────────────────────────────

/**
 * Schedules a delayed job that triggers question evaluation after the timer expires.
 *
 * @param sessionId  Active session ID
 * @param questionId Question being answered
 * @param delayMs    Milliseconds until the timer expires (question.timeLimit * 1000)
 */
export async function scheduleQuestionEvaluation(
  sessionId: string,
  questionId: string,
  delayMs: number
) {
  const jobId = `evaluate:${sessionId}:${questionId}`;

  await sessionQueue.add(
    'evaluate-question',
    { sessionId, questionId },
    {
      delay: delayMs,
      jobId,
      // Prevent duplicate jobs for the same question
      deduplication: { id: jobId },
    }
  );

  logger.info(
    { sessionId, questionId, delayMs },
    'Scheduled question evaluation job'
  );
}
