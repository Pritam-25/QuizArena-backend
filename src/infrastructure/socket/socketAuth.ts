import { parse as parseCookie } from 'cookie';
import logger from '@infrastructure/logger/logger.js';
import { AUTH_COOKIE_NAME } from '@modules/auth/auth.constants.js';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@shared/utils/socket/index.js';
import type { Socket } from 'socket.io';
import { extractToken, verifyToken } from '@shared/utils/auth/index.js';

/** Fully-typed socket handle used inside infrastructure middleware. */
type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type SocketMiddlewareNext = (error?: Error) => void;

const normalizeAuthToken = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.startsWith('Bearer ') ? trimmed.slice(7).trim() : trimmed;
};

const extractTokenFromHandshakeAuth = (socket: AppSocket) => {
  const authPayload = socket.handshake.auth;

  if (typeof authPayload === 'string') {
    return normalizeAuthToken(authPayload);
  }

  if (!authPayload || typeof authPayload !== 'object') {
    return undefined;
  }

  const tokenCandidate =
    'token' in authPayload && typeof authPayload.token === 'string'
      ? authPayload.token
      : 'accessToken' in authPayload &&
          typeof authPayload.accessToken === 'string'
        ? authPayload.accessToken
        : undefined;

  return normalizeAuthToken(tokenCandidate);
};

/**
 * Extracts JWT token from Socket.IO handshake cookies/auth payload or Authorization header.
 *
 * Cookie token is preferred to align with HTTP auth middleware behavior.
 *
 * @param socket - Incoming socket connection.
 * @returns JWT token if present.
 */
const extractTokenFromHandshake = (socket: AppSocket) => {
  const cookieHeader = socket.handshake.headers.cookie;
  const cookieSource = Array.isArray(cookieHeader)
    ? cookieHeader.join('; ')
    : cookieHeader;

  const tokenFromCookie = cookieSource
    ? parseCookie(cookieSource)[AUTH_COOKIE_NAME]
    : undefined;
  const tokenFromHandshakeAuth = extractTokenFromHandshakeAuth(socket);

  const authHeader = socket.handshake.headers.authorization;
  const authHeaderValue = Array.isArray(authHeader)
    ? authHeader[0]
    : authHeader;

  return extractToken({
    cookieToken: tokenFromCookie ?? tokenFromHandshakeAuth,
    authHeader: authHeaderValue,
  });
};

/**
 * Socket.IO authentication middleware.
 *
 * Validates JWT from handshake cookie/auth payload or bearer token.
 *
 * Guest sockets are allowed when no token is provided. When a token is
 * present, it must be valid and the authenticated user id is stored on
 * socket data for downstream event handlers.
 */
export const socketAuthMiddleware = (
  socket: AppSocket,
  next: SocketMiddlewareNext
) => {
  const token = extractTokenFromHandshake(socket);

  if (!token) {
    return next();
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
