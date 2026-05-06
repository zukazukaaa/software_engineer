import type { FastifyInstance } from 'fastify';
import type {
  IntelligenceLayers,
  NexusLayers,
  OmegaInput,
  OmegaOptions,
  AnyLayerKey,
} from '@omega/core';
import { reasonRequestSchema } from '@omega/shared';
import { omegaEngine } from '../engine.js';

export const omegaRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post('/reason', async (request, reply) => {
    const parsed = reasonRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_request', issues: parsed.error.issues });
    }

    if (!omegaEngine.hasDomain(parsed.data.domain)) {
      return reply.code(404).send({ error: 'unknown_domain', domain: parsed.data.domain });
    }

    const input: OmegaInput = {
      query: parsed.data.query,
      domain: parsed.data.domain,
      layers: parsed.data.layers as Partial<IntelligenceLayers>,
      nexus: parsed.data.nexus as Partial<NexusLayers> | undefined,
      options: parsed.data.options as OmegaOptions | undefined,
    };

    const output = await omegaEngine.reason(input);
    return reply.send(output);
  });

  app.post('/reason/:domain', async (request, reply) => {
    const { domain } = request.params as { domain: string };
    const body = (request.body ?? {}) as Record<string, unknown>;
    const parsed = reasonRequestSchema.safeParse({ ...body, domain });
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_request', issues: parsed.error.issues });
    }
    if (!omegaEngine.hasDomain(domain)) {
      return reply.code(404).send({ error: 'unknown_domain', domain });
    }

    const adapter = omegaEngine.getDomain(domain)!;
    const input: OmegaInput = {
      query: parsed.data.query,
      domain,
      layers: parsed.data.layers as Partial<IntelligenceLayers>,
      nexus: parsed.data.nexus as Partial<NexusLayers> | undefined,
      options: parsed.data.options as OmegaOptions | undefined,
    };
    const output = await omegaEngine.reason(input);
    return reply.send(adapter.formatOutput(output));
  });
};

export const _intellisenseGuard: AnyLayerKey | null = null;
