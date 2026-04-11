import 'express';
import type { Logger } from 'pino';

declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: string;
    }

    interface Request {
      user?: AuthenticatedUser;
      userId?: string;
      requestId?: string;
      logger: Logger;
    }
  }
}

export {};
