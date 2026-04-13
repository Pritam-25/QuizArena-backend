import http from 'node:http';
import logger from '@infrastructure/logger/logger.js';
import app from './app.js';
import { env } from '@config/env.js';
import { prisma } from '@infrastructure/database/prismaClient.js';
import {
  closeSocketInfrastructure,
  setupSocketServer,
} from '@infrastructure/socket/socketServer.js';

const PORT = env.PORT;

/**
 * Boots application infrastructure and starts the HTTP server.
 */
const startServer = async () => {
  await prisma.$connect();
  logger.info('Prisma connected');

  const server = http.createServer(app);

  await setupSocketServer(server);
  logger.info('Socket.IO initialized with Redis adapter');

  server.listen(PORT, () => {
    logger.info(
      `Server started at http://localhost:${PORT}/api/v1 in ${env.NODE_ENV} mode`
    );
  });

  return server;
};

const server = await startServer();

let isShuttingDown = false;

/**
 * Performs graceful shutdown for HTTP server, Socket.IO infrastructure, and Prisma.
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
