import type { FastifyInstance } from 'fastify';
import { INTELLIGENCE_KEYS, NEXUS_KEYS } from '@omega/core';

export const layerRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/', async () => ({
    intelligence: INTELLIGENCE_KEYS,
    nexus: NEXUS_KEYS,
  }));

  app.get('/:name', async (request, reply) => {
    const { name } = request.params as { name: string };
    const all: readonly string[] = [...INTELLIGENCE_KEYS, ...NEXUS_KEYS];
    if (!all.includes(name)) return reply.code(404).send({ error: 'unknown_layer', name });
    return { name, status: 'ok' };
  });
};
