import type { Server as HttpServer } from 'node:http';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { Server as SocketIOServer } from 'socket.io';
import { env } from '@config/env.js';
import logger from '@infrastructure/logger/logger.js';
import { socketAuthMiddleware } from './socketAuth.js';

type RedisClient = ReturnType<typeof createClient>;

let io: SocketIOServer | null = null;
let pubClient: RedisClient | null = null;
let subClient: RedisClient | null = null;

/**
 * Creates and connects Redis pub/sub clients used by the Socket.IO adapter.
 */
const connectAdapterClients = async () => {
  pubClient = createClient({ url: env.REDIS_URL });
  subClient = pubClient.duplicate();

  pubClient.on('error', error => {
    logger.error({ err: error }, 'Socket Redis pub client error');
  });

  subClient.on('error', error => {
    logger.error({ err: error }, 'Socket Redis sub client error');
  });

  await Promise.all([pubClient.connect(), subClient.connect()]);

  logger.info('Socket Redis adapter clients connected');
};

/**
 * Initializes a singleton Socket.IO server on top of the provided HTTP server.
 *
 * If Redis adapter clients are not connected yet, they are created and connected
 * before attaching the adapter.
 *
 * @param httpServer Node HTTP server hosting the Express app.
 * @returns Initialized Socket.IO server instance.
 */
export const setupSocketServer = async (httpServer: HttpServer) => {
  if (!io) {
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: true,
        credentials: true,
      },
    });

    io.use(socketAuthMiddleware);

    io.on('connection', socket => {
      logger.info(
        { socketId: socket.id, userId: socket.data.userId },
        'Socket connected'
      );

      socket.on('disconnect', reason => {
        logger.info({ socketId: socket.id, reason }, 'Socket disconnected');
      });
    });
  }

  if (!pubClient || !subClient || !pubClient.isOpen || !subClient.isOpen) {
    await connectAdapterClients();
  }

  if (!pubClient || !subClient) {
    throw new Error('Failed to initialize Redis clients for Socket.IO adapter');
  }

  io.adapter(createAdapter(pubClient, subClient));

  return io;
};

/**
 * Returns the initialized Socket.IO server instance.
 *
 * @throws Error when called before setupSocketServer.
 */
export const getSocketServer = () => {
  if (!io) {
    throw new Error('Socket.IO server is not initialized');
  }

  return io;
};

/**
 * Closes the Socket.IO server and Redis adapter connections gracefully.
 */
export const closeSocketInfrastructure = async () => {
  const shutdownTasks: Array<Promise<unknown>> = [];

  if (io) {
    await new Promise<void>(resolve => {
      io?.close(() => {
        resolve();
      });
    });
    io = null;
  }

  if (subClient?.isOpen) {
    shutdownTasks.push(subClient.quit());
  }

  if (pubClient?.isOpen) {
    shutdownTasks.push(pubClient.quit());
  }

  await Promise.allSettled(shutdownTasks);
  pubClient = null;
  subClient = null;
};
