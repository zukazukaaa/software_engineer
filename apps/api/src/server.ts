import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { config } from './config.js';
import { logger } from './logger.js';
import { healthRoutes } from './routes/health.js';
import { omegaRoutes } from './routes/omega.js';
import { domainRoutes } from './routes/domains.js';
import { layerRoutes } from './routes/layers.js';

export const buildServer = async () => {
  const app = Fastify({ loggerInstance: logger });

  await app.register(helmet);
  await app.register(cors, { origin: true });

  await app.register(healthRoutes);
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
