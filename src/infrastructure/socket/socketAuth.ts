import { parse as parseCookie } from 'cookie';
import logger from '@infrastructure/logger/logger.js';
import { AUTH_COOKIE_NAME } from '@modules/auth/auth.constants.js';
import type { Socket } from 'socket.io';
import { extractToken, verifyToken } from '@shared/utils/auth/index.js';

type SocketMiddlewareNext = (error?: Error) => void;

/**
 * Extracts JWT token from Socket.IO handshake cookies or Authorization header.
 *
 * Cookie token is preferred to align with HTTP auth middleware behavior.
 *
 * @param socket - Incoming socket connection.
 * @returns JWT token if present.
 */
const extractTokenFromHandshake = (socket: Socket) => {
  const cookieHeader = socket.handshake.headers.cookie;
  const cookieSource = Array.isArray(cookieHeader)
    ? cookieHeader.join('; ')
    : cookieHeader;

  const tokenFromCookie = cookieSource
    ? parseCookie(cookieSource)[AUTH_COOKIE_NAME]
    : undefined;

  const authHeader = socket.handshake.headers.authorization;
  const authHeaderValue = Array.isArray(authHeader)
    ? authHeader[0]
    : authHeader;
  return extractToken({
    cookieToken: tokenFromCookie,
    authHeader: authHeaderValue,
  });
};

/**
 * Socket.IO authentication middleware.
 *
 * Validates JWT from handshake cookie or bearer token and stores authenticated
 * user id on socket data for downstream event handlers.
 */
export const socketAuthMiddleware = (
  socket: Socket,
  next: SocketMiddlewareNext
) => {
  const token = extractTokenFromHandshake(socket);

  if (!token) {
    return next(new Error('UNAUTHORIZED'));
  }

  try {
    const decoded = verifyToken(token);

    socket.data.userId = decoded.userId;

    return next();
  } catch (error) {
    logger.warn(
      {
        socketId: socket.id,
        err: error,
      },
      'Socket authentication failed'
    );

    return next(new Error('INVALID_TOKEN'));
  }
};
