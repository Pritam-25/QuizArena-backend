import http from 'node:http';
import logger from '@infrastructure/logger/logger.js';
import app from './app.js';
import { env } from '@config/env.js';
import { prisma } from '@infrastructure/database/prismaClient.js';
import { redis } from '@infrastructure/redis/redisClient.js';
import {
  closeSocketInfrastructure,
  setupSocketServer,
  getSocketServer,
} from '@infrastructure/socket/socketServer.js';
import { SessionWorker } from '@infrastructure/queue/sessionWorker.js';
import { createSessionModule } from '@modules/session/session.factory.js';

const PORT = env.PORT;

/**
 * Boots application infrastructure and starts the HTTP server.
 *
 * All module instances are created once here (single composition root) and
 * injected into the layers that need them. Nothing downstream self-wires.
 */
const startServer = async () => {
  await prisma.$connect();
  logger.info('Prisma connected');

  const server = http.createServer(app);

  // Single composition root — one module instance shared by socket + worker
  const { service: sessionService } = createSessionModule();

  await setupSocketServer(server, sessionService);
  logger.info('Socket.IO initialized with Redis adapter');

  const sessionWorker = new SessionWorker(
    sessionService,
    getSocketServer,
    redis
  );
  sessionWorker.start();
  logger.info('BullMQ session worker started');

  server.listen(PORT, () => {
    logger.info(
      `Server started at http://localhost:${PORT}/api/v1 in ${env.NODE_ENV} mode`
    );
  });

  return { server, sessionWorker };
};

const { server, sessionWorker } = await startServer();

let isShuttingDown = false;

/**
 * Performs graceful shutdown for HTTP server, Socket.IO infrastructure,
 * BullMQ worker, and Prisma.
 *
 * @param signal OS signal that triggered shutdown.
 */
const shutdown = async (signal: NodeJS.Signals) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info(
    { signal },
    'Shutdown signal received. Closing server gracefully...'
  );

  server.close(async (error?: Error) => {
    if (error) {
      logger.error({ err: error }, 'Error while closing HTTP server');
      process.exit(1);
    }

    logger.info('HTTP server closed');

    try {
      await closeSocketInfrastructure();
      logger.info('Socket infrastructure closed');

      await sessionWorker.stop();
      logger.info('Session worker stopped');

      await prisma.$disconnect();
      logger.info('Prisma disconnected');
    } catch (error) {
      logger.error(
        { err: error },
        'Failed to close socket infrastructure or disconnect Prisma'
      );
      process.exit(1);
    }

    process.exit(0);
  });
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
