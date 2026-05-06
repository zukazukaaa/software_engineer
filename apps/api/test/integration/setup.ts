/**
 * Integration-test scaffolding.
 *
 * Talks to the real services declared in docker-compose.test.yml
 * (Postgres on 5433, Redis on 6380). The driver is
 * scripts/test-integration.sh: it brings the compose up, runs
 * `prisma migrate deploy` against the test DB, calls vitest with
 * INTEGRATION=1, then tears the compose down (always, via trap).
 *
 * Each test file imports `getTestApp()` to get a fresh, fully-wired
 * Fastify instance backed by the real Postgres + real Redis. The
 * scaffold also exposes `truncateAll()` so individual tests can reset
 * state between cases.
 */

import { afterAll, beforeAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';

// IMPORTANT: env stubs must be set BEFORE buildServer/Prisma modules are
// imported, so config/env.ts validates against the real test URLs.
const setIfMissing = (key: string, value: string): void => {
  if (!process.env[key]) process.env[key] = value;
};
setIfMissing('NODE_ENV', 'test');
setIfMissing(
  'DATABASE_URL',
  'postgresql://omega:omega_test@localhost:5433/omega_test?schema=public',
);
setIfMissing('REDIS_URL', 'redis://localhost:6380');
setIfMissing('JWT_SECRET', 'integration-test-jwt');
setIfMissing('JWT_REFRESH_SECRET', 'integration-test-refresh');
// Force fail-closed in integration so the unavailability path is testable.
setIfMissing('REDIS_FAIL_MODE', 'closed');

let app: FastifyInstance | null = null;
let redis: Redis | null = null;

const TABLES = [
  'ApiKey',
  'Feedback',
  'Reasoning',
  'KnowledgeEntry',
  'Experience',
  'UserAuth',
  'Domain',
];

export const getTestApp = async (): Promise<FastifyInstance> => {
  if (app) return app;
  // dynamic import after env stubs are set
  const { buildServer } = await import('../../src/server.js');
  const { initRedis } = await import('../../src/redis/client.js');
  const { connectPrisma } = await import('@omega/db');
  redis = initRedis({ url: process.env.REDIS_URL! });
  await connectPrisma();
  app = await buildServer();
  return app;
};

export const getTestPrisma = async () => {
  const { getPrisma } = await import('@omega/db');
  return getPrisma();
};

export const getTestRedis = async (): Promise<Redis> => {
  if (!redis) {
    const { initRedis } = await import('../../src/redis/client.js');
    redis = initRedis({ url: process.env.REDIS_URL! });
  }
  return redis;
};

export const truncateAll = async (): Promise<void> => {
  const prisma = await getTestPrisma();
  // CASCADE picks up FK relations; RESTART IDENTITY resets sequences if
  // any (cuid PKs don't use them but harmless).
  const tableList = TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`);

  const r = await getTestRedis();
  await r.flushdb();
};

export const setupIntegration = (): void => {
  beforeAll(async () => {
    await getTestApp();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
      app = null;
    }
    const { disconnectPrisma } = await import('@omega/db');
    await disconnectPrisma();
    const { closeRedis } = await import('../../src/redis/client.js');
    await closeRedis();
    redis = null;
  });
};
