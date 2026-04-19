import type { Server as HttpServer } from 'node:http';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { Server as SocketIOServer } from 'socket.io';
import { env } from '@config/env.js';
import { SOCKET_EVENTS } from '@shared/utils/socket/index.js';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@shared/utils/socket/index.js';
import logger from '@infrastructure/logger/logger.js';
import { socketAuthMiddleware } from './socketAuth.js';
import { registerSessionSocketHandlers } from '@modules/session/session.socket.handlers.js';

type RedisClient = ReturnType<typeof createClient>;

/** Fully-typed Socket.IO server type used throughout the application. */
export type AppServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

let io: AppServer | null = null;
let pubClient: RedisClient | null = null;
let subClient: RedisClient | null = null;

const closeRedisClient = async (client: RedisClient | null) => {
  if (!client) {
    return;
  }

  try {
    if (client.isOpen) {
      await client.quit();
      return;
    }

    client.destroy();
  } catch (error) {
    logger.warn({ err: error }, 'Failed to close socket Redis client');
  }
};

/**
 * Creates and connects Redis pub/sub clients used by the Socket.IO adapter.
 */
const connectAdapterClients = async () => {
  if (pubClient || subClient) {
    await Promise.allSettled([
      closeRedisClient(subClient),
      closeRedisClient(pubClient),
    ]);
    pubClient = null;
    subClient = null;
  }

  const nextPubClient = createClient({ url: env.REDIS_URL });
  const nextSubClient = nextPubClient.duplicate();

  nextPubClient.on('error', error => {
    logger.error({ err: error }, 'Socket Redis pub client error');
  });

  nextSubClient.on('error', error => {
    logger.error({ err: error }, 'Socket Redis sub client error');
  });

  try {
    await Promise.all([nextPubClient.connect(), nextSubClient.connect()]);
  } catch (error) {
    await Promise.allSettled([
      closeRedisClient(nextSubClient),
      closeRedisClient(nextPubClient),
    ]);
    pubClient = null;
    subClient = null;
    throw error;
  }

  pubClient = nextPubClient;
  subClient = nextSubClient;

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
    io = new SocketIOServer<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      SocketData
    >(httpServer, {
      cors: {
        origin: env.CORS_ORIGINS,
        credentials: true,
      },
    });

    // Cast needed: Socket.IO's middleware types don't carry generics.
    io.use(socketAuthMiddleware as Parameters<typeof io.use>[0]);

    io.on('connection', socket => {
      logger.info(
        { socketId: socket.id, userId: socket.data.userId },
        'Socket connected'
      );

      // Notify the client once the connection is established and auth has resolved.
      socket.emit(SOCKET_EVENTS.SOCKET_READY, {
        userId: socket.data.userId ?? null,
      });

      registerSessionSocketHandlers(io!, socket);

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
  if (io) {
    await new Promise<void>(resolve => {
      io?.close(() => {
        resolve();
      });
    });
    io = null;
  }

  await Promise.allSettled([
    closeRedisClient(subClient),
    closeRedisClient(pubClient),
  ]);
  pubClient = null;
  subClient = null;
};
