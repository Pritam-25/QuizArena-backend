import logger from '@infrastructure/logger/logger.js';
import app from './app.js';
import { env } from '@config/env.js';
import { prisma } from '@infrastructure/database/prismaClient.js';

const PORT = env.PORT;

const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('Prisma connected');

    const server = app.listen(PORT, () => {
      logger.info(
        `Server started at http://localhost:${PORT}/api/v1 in ${env.NODE_ENV} mode`
      );
    });

    server.on('error', error => {
      logger.error({ err: error }, 'HTTP server failed during startup');
      process.exit(1);
    });

    return server;
  } catch (error) {
    logger.error({ err: error }, 'Startup failed before server became ready');
    process.exit(1);
  }
};

const server = await startServer();

let isShuttingDown = false;

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
      await prisma.$disconnect();
      logger.info('Prisma disconnected');
    } catch (error) {
      logger.error({ err: error }, 'Failed to disconnect Prisma');
      process.exit(1);
    }

    process.exit(0);
  });
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
