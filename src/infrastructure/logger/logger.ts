import pino from 'pino';
import { env } from '@config/env.js';

const isProd = env.NODE_ENV === 'production';
const isLokiEnabled = isProd && Boolean(env.LOKI_HOST);

const transport = !isProd
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: true,
      },
    }
  : isLokiEnabled
    ? {
        targets: [
          {
            target: 'pino-loki',
            options: {
              host: env.LOKI_HOST,
              labels: {
                service: env.SERVICE_NAME || 'quiz-arena-api',
                env: env.NODE_ENV,
              },
              batching: {
                interval: 5,
              },
            },
          },
        ],
      }
    : undefined;

const logger = pino({
  level: isProd ? 'info' : 'debug',
  base: {
    service: env.SERVICE_NAME || 'quiz-arena-api',
  },
  timestamp: pino.stdTimeFunctions.isoTime,

  ...(transport && { transport }),
});

export default logger;
