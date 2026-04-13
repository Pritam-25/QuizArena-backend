# Testing Guide

## Stack

- Test runner: Vitest
- HTTP API tests: Supertest + Vitest
- DB integration tests: Vitest with Prisma against a dedicated test database

## Folder Structure

- `test/unit` - pure unit tests (no DB/network)
- `test/api` - HTTP tests against Express app using Supertest
- `test/integration` - DB-backed integration tests
- `test/setup` - shared Vitest setup files

## Environment

Create `.env.test` with at least:

- `DATABASE_URL` (point to dedicated test DB)
- `JWT_SECRET`
- `PORT`
- `NODE_ENV=test`

`test/setup/env.setup.ts` provides safe defaults for local runs, but real integration tests should always use a real `.env.test` database URL.

## Commands

- `pnpm test:unit`
- `pnpm test:api`
- `pnpm test:integration`
- `pnpm test:all`
- `pnpm test:coverage`

For DB-backed integration runs:

1. Ensure `.env.test` points to a dedicated test database.
2. Run `pnpm test:integration:db`.

## Neon DB Recommendation

Yes, use a separate Neon database branch for tests. Never run integration tests against dev/prod branches.

Suggested strategy:

1. Start with one persistent branch (for example `test`).
2. In CI, evolve to ephemeral branches per PR.
3. Reset/migrate test DB before integration test runs.

## CI Pipeline

Workflow file: `.github/workflows/tests.yml`

Pipeline jobs:

1. `unit-and-api` runs on push/PR
2. `integration-db` runs after unit/api only when test DB secrets are configured

Required GitHub secrets:

1. `DATABASE_URL_TEST`
2. `JWT_SECRET_TEST`

Notes:

1. CI generates `.env.test` from secrets at runtime.
2. Integration job runs `pnpm run test:integration:db`, which resets and migrates the test database.
3. Use a dedicated Neon test branch and never point `DATABASE_URL_TEST` to dev/prod.
