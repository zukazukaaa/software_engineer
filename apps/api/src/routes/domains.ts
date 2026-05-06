import type { FastifyInstance } from 'fastify';
import { omegaEngine } from '../engine.js';

export const domainRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/', async () => {
    return omegaEngine.listDomains().map((d) => ({
      name: d.name,
      version: d.version,
      active: true,
    }));
  });

  app.get('/:name/health', async (request, reply) => {
    const { name } = request.params as { name: string };
    const adapter = omegaEngine.getDomain(name);
    if (!adapter) return reply.code(404).send({ error: 'unknown_domain', name });
    return { name: adapter.name, version: adapter.version, status: 'ok' };
  });
};
