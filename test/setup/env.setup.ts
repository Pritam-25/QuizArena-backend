import { config } from 'dotenv';

config({
  path: process.env.DOTENV_CONFIG_PATH ?? '.env.test',
  override: true,
  quiet: true,
});

process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '4000';
process.env.SERVICE_NAME ??= 'quiz-arena-api-test';
process.env.JWT_SECRET ??= 'test-secret';
process.env.DATABASE_URL ??=
  'postgresql://user:password@127.0.0.1:5432/quiz_arena_test';
