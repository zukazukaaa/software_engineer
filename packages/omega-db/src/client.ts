import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma client.
 *
 * - Exactly one client per process. Hot-reload safe: the instance is
 *   stashed on `globalThis` so `tsx watch` reload doesn't pile up
 *   connection pools.
 * - Log levels are tuned per NODE_ENV: prod stays quiet, dev shows
 *   warnings, test stays quiet too (test output is already noisy).
 *
 * Use `getPrisma()` to read; call `connectPrisma()` once at boot to
 * fail fast on bad DATABASE_URL, and `disconnectPrisma()` on
 * graceful shutdown / between integration test runs.
 */

declare global {
  // eslint-disable-next-line no-var
  var __omegaPrisma: PrismaClient | undefined;
}

const logForEnv = (env: string | undefined): ('warn' | 'error' | 'info' | 'query')[] => {
  switch (env) {
    case 'production':
      return ['error'];
    case 'test':
      return ['error'];
    default:
      return ['warn', 'error'];
  }
};

const create = (): PrismaClient =>
  new PrismaClient({
    log: logForEnv(process.env.NODE_ENV),
  });

export const getPrisma = (): PrismaClient => {
  if (!globalThis.__omegaPrisma) {
    globalThis.__omegaPrisma = create();
  }
  return globalThis.__omegaPrisma;
};

export const connectPrisma = async (): Promise<PrismaClient> => {
  const client = getPrisma();
  await client.$connect();
  return client;
};

export const disconnectPrisma = async (): Promise<void> => {
  if (globalThis.__omegaPrisma) {
    await globalThis.__omegaPrisma.$disconnect();
    globalThis.__omegaPrisma = undefined;
  }
};
