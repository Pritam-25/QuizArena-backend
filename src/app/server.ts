import logger from '@infrastructure/logger/logger.js';
import app from './app.js';
import { env } from '@config/env.js';
import { prisma } from '@infrastructure/database/prismaClient.js';

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  logger.info(
    `Server started at http://localhost:${PORT}/api/v1 in ${env.NODE_ENV} mode`
  );
});

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

  try {
    await prisma.$disconnect();
    logger.info('Prisma disconnected');
  } catch (error) {
    logger.error({ err: error }, 'Failed to disconnect Prisma');
  }

  server.close((error?: Error) => {
    if (error) {
      logger.error({ err: error }, 'Error while closing HTTP server');
      process.exit(1);
      return;
    }

    logger.info('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
