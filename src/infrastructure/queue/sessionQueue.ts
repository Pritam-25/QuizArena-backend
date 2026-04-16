import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import logger from '@infrastructure/logger/logger.js';

/**
 * BullMQ queue for session-related delayed/scheduled jobs.
 *
 * The `redis` client is injected so the class can be mocked in unit tests
 * without touching the real ioredis singleton.
 */
export class SessionQueue {
  private readonly queue: Queue;

  constructor(redis: Redis) {
    this.queue = new Queue('session', {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1_000 },
        removeOnComplete: true,
        removeOnFail: { count: 50 },
      },
    });

    this.queue.on('error', (error: Error) => {
      logger.error({ err: error }, 'Session queue error');
    });
  }

  /**
   * Schedules a delayed job that triggers question evaluation after the timer expires.
   *
   * @param sessionId  Active session ID
   * @param questionId Question being answered
   * @param delayMs    Milliseconds until the timer expires (question.timeLimit * 1000)
   */
  async scheduleQuestionEvaluation(
    sessionId: string,
    questionId: string,
    delayMs: number
  ): Promise<void> {
    const jobId = `evaluate:${sessionId}:${questionId}`;

    await this.queue.add(
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

  /**
   * Gracefully closes the underlying BullMQ queue connection.
   */
  async close(): Promise<void> {
    await this.queue.close();
  }
}
