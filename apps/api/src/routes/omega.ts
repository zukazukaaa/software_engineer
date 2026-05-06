import type { FastifyInstance } from 'fastify';
import type {
  IntelligenceLayers,
  NexusLayers,
  OmegaInput,
  OmegaOptions,
} from '@omega/core';
import { omegaInputSchema } from '@omega/shared';
import type { ZodIssue } from 'zod';
import { omegaEngine } from '../engine.js';

const LAYER_KEYS = new Set(['K', 'I', 'O', 'C', 'E', 'P', 'L', 'H', 'N', 'S', 'AI']);

interface FormattedIssue {
  /** Layer the issue belongs to, if the path passes through layers/nexus. */
  layer?: string;
  /** Dotted path to the offending field (e.g. "layers.K.facts.0.weight"). */
  path: string;
  /** Zod issue code (invalid_type, too_small, unrecognized_keys, ...). */
  code: string;
  message: string;
}

const formatIssue = (issue: ZodIssue): FormattedIssue => {
  const path = issue.path.map(String);
  let layer: string | undefined;
  if ((path[0] === 'layers' || path[0] === 'nexus') && path[1] && LAYER_KEYS.has(path[1])) {
    layer = path[1];
  }
  return {
    ...(layer ? { layer } : {}),
    path: path.join('.') || '(root)',
    code: issue.code,
    message: issue.message,
  };
};

export const omegaRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post('/reason', async (request, reply) => {
    const parsed = omegaInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_request',
        issues: parsed.error.issues.map(formatIssue),
      });
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
    const parsed = omegaInputSchema.safeParse({ ...body, domain });
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_request',
        issues: parsed.error.issues.map(formatIssue),
      });
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
