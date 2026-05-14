// Must be the first import — populates process.env from .env in dev
// before ./config/env reads it. No-op in production.
import './bootstrap-env.js';

import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { connectPrisma, disconnectPrisma, getPrisma } from '@omega/db';
import { env } from './config/env.js';
import { logger } from './logger.js';
import { closeRedis, initRedis } from './redis/client.js';
import { healthRoutes } from './routes/health.js';
import { omegaRoutes } from './routes/omega.js';
import { domainRoutes } from './routes/domains.js';
import { layerRoutes } from './routes/layers.js';
import { authRoutes } from './routes/auth.js';
import authPlugin from './plugins/auth.js';
import rateLimitPlugin from './plugins/rate-limit.js';
import { InMemoryAuthStore } from './auth/in-memory-store.js';
import { PrismaAuthStore } from './auth/prisma-store.js';
import type { AuthStore } from './auth/types.js';
import type { TokenConfig } from './auth/tokens.js';
import type { RateLimiter } from './rate-limit/types.js';
import { RedisRateLimiter } from './rate-limit/redis.js';

export interface BuildServerOptions {
  authStore?: AuthStore;
  rateLimiter?: RateLimiter;
  tokenConfig?: Partial<TokenConfig>;
}

const resolveTokenConfig = (override?: Partial<TokenConfig>): TokenConfig => ({
  accessSecret: override?.accessSecret ?? env.JWT_SECRET,
  refreshSecret: override?.refreshSecret ?? env.JWT_REFRESH_SECRET,
  accessExpiresIn: override?.accessExpiresIn ?? env.JWT_EXPIRES_IN,
  refreshExpiresIn: override?.refreshExpiresIn ?? env.JWT_REFRESH_EXPIRES_IN,
});

const resolveDefaultAuthStore = (): AuthStore => {
  // Tests inject InMemoryAuthStore explicitly; this default kicks in
  // when buildServer({}) is called without overrides — i.e. real
  // dev / staging / prod against a real Postgres.
  if (env.NODE_ENV === 'test') {
    return new InMemoryAuthStore();
  }
  return new PrismaAuthStore(getPrisma());
};

const resolveDefaultRateLimiter = (): RateLimiter => {
  const client = initRedis({ url: env.REDIS_URL });
  return new RedisRateLimiter(client, {
    failOpen: env.REDIS_FAIL_MODE === 'open',
    logger,
  });
};

export const buildServer = async (opts: BuildServerOptions = {}) => {
  const app = Fastify({ loggerInstance: logger });

  await app.register(helmet);
  await app.register(cors, { origin: true });

  const authStore = opts.authStore ?? resolveDefaultAuthStore();
  const rateLimiter = opts.rateLimiter ?? resolveDefaultRateLimiter();
  const tokenConfig = resolveTokenConfig(opts.tokenConfig);

  await app.register(authPlugin, { authStore, tokenConfig });
  await app.register(rateLimitPlugin, { rateLimiter });

  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(omegaRoutes, { prefix: '/api/omega' });
  await app.register(domainRoutes, { prefix: '/api/domains' });
  await app.register(layerRoutes, { prefix: '/api/layers' });

  return app;
};

const entry = process.argv[1] ? fileURLToPath(import.meta.url) === process.argv[1] : false;
if (entry) {
  const start = async () => {
    // Connect dependencies early so we fail fast on bad URLs.
    initRedis({ url: env.REDIS_URL });
    await connectPrisma().catch((err) => {
      logger.error({ err }, 'Postgres connection failed at boot');
      process.exit(1);
    });

    const app = await buildServer();
    const addr = await app.listen({ host: env.API_HOST, port: env.API_PORT });
    logger.info({ addr }, 'ΩE API listening');

    const shutdown = async (signal: NodeJS.Signals) => {
      logger.info({ signal }, 'shutting down');
      try {
        await app.close();
        await disconnectPrisma();
        await closeRedis();
      } finally {
        process.exit(0);
      }
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  };
  start().catch((err) => {
    logger.error(err, 'failed to start');
    process.exit(1);
  });
}
