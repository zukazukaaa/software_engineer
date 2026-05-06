import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { Redis } from 'ioredis';
import { config } from './config.js';
import { logger } from './logger.js';
import { healthRoutes } from './routes/health.js';
import { omegaRoutes } from './routes/omega.js';
import { domainRoutes } from './routes/domains.js';
import { layerRoutes } from './routes/layers.js';
import { authRoutes } from './routes/auth.js';
import authPlugin from './plugins/auth.js';
import rateLimitPlugin from './plugins/rate-limit.js';
import { InMemoryAuthStore } from './auth/in-memory-store.js';
import type { AuthStore } from './auth/types.js';
import type { TokenConfig } from './auth/tokens.js';
import type { RateLimiter } from './rate-limit/types.js';
import { InMemoryRateLimiter } from './rate-limit/in-memory.js';
import { NoopRateLimiter } from './rate-limit/noop.js';
import { RedisRateLimiter } from './rate-limit/redis.js';

export interface BuildServerOptions {
  authStore?: AuthStore;
  rateLimiter?: RateLimiter;
  tokenConfig?: Partial<TokenConfig>;
}

const resolveTokenConfig = (override?: Partial<TokenConfig>): TokenConfig => ({
  accessSecret: override?.accessSecret ?? config.JWT_SECRET,
  refreshSecret: override?.refreshSecret ?? config.JWT_REFRESH_SECRET,
  accessExpiresIn: override?.accessExpiresIn ?? config.JWT_EXPIRES_IN,
  refreshExpiresIn: override?.refreshExpiresIn ?? config.JWT_REFRESH_EXPIRES_IN,
});

const resolveRateLimiter = (): RateLimiter => {
  if (!config.REDIS_URL) {
    if (config.NODE_ENV === 'production') {
      logger.warn('REDIS_URL not set in production — using in-memory limiter (NOT cluster-safe)');
      return new InMemoryRateLimiter();
    }
    logger.info('REDIS_URL not set — using no-op rate limiter for dev');
    return new NoopRateLimiter();
  }
  // lazy connect to avoid crashing the server if Redis is briefly unreachable
  const client = new Redis(config.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  client.on('error', (err) => logger.warn({ err }, 'redis connection error'));
  return new RedisRateLimiter(client, {
    failOpen: config.NODE_ENV !== 'production',
    logger,
  });
};

export const buildServer = async (opts: BuildServerOptions = {}) => {
  const app = Fastify({ loggerInstance: logger });

  await app.register(helmet);
  await app.register(cors, { origin: true });

  const authStore = opts.authStore ?? new InMemoryAuthStore();
  const rateLimiter = opts.rateLimiter ?? resolveRateLimiter();
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
  buildServer()
    .then((app) => app.listen({ host: config.API_HOST, port: config.API_PORT }))
    .then((addr) => logger.info({ addr }, 'ΩE API listening'))
    .catch((err) => {
      logger.error(err, 'failed to start');
      process.exit(1);
    });
}
