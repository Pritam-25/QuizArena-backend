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
    SERVICE_NAME: z.string().default('quiz-arena-api'),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
    OTEL_DEBUG: z.enum(['true', 'false']).default('false'),
    LOKI_HOST: z.url().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
