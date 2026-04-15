import 'dotenv/config';
import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    PORT: z.string().default('4000'),
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    DATABASE_URL: z.url(),
    REDIS_URL: z.url().refine(
      value => {
        const protocol = new URL(value).protocol;
        return protocol === 'redis:' || protocol === 'rediss:';
      },
      {
        message: 'REDIS_URL must use redis:// or rediss://',
      }
    ),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:3000')
      .transform(value =>
        value
          .split(',')
          .map(origin => origin.trim())
          .filter(origin => origin.length > 0)
      )
      .refine(origins => origins.length > 0, {
        message: 'CORS_ORIGINS must include at least one origin',
      }),
    JWT_SECRET: z.string().min(1),
    SERVICE_NAME: z.string().default('quiz-arena-api'),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
    OTEL_DEBUG: z.enum(['true', 'false']).default('false'),
    LOKI_HOST: z.url().optional(),
    PUBLIC_URL: z.string().optional(),
    BASE_URL: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
