import { z } from 'zod';
import { aiLayerSchema } from './ai.schema.js';
import { contextLayerSchema } from './context.schema.js';
import { experienceLayerSchema } from './experience.schema.js';
import { humanLayerSchema } from './human.schema.js';
import { informationLayerSchema } from './information.schema.js';
import { knowledgeLayerSchema } from './knowledge.schema.js';
import { learningLayerSchema } from './learning.schema.js';
import { natureLayerSchema } from './nature.schema.js';
import { observationLayerSchema } from './observation.schema.js';
import { probabilityLayerSchema } from './probability.schema.js';
import { scienceLayerSchema } from './science.schema.js';

/**
 * Aggregate input schema for /api/omega/reason.
 *
 * Strictness contract:
 *   - top-level OmegaInput rejects unknown keys
 *   - the layers/nexus dictionaries reject unknown layer keys (typos like
 *     'k' or 'X' fail validation)
 *   - each layer's payload is validated against its strict per-layer schema
 *
 * Free-form-but-bounded fields (`raw`, `value`, `outcome`, `normalized`,
 * `scope`, `invariants`) accept arbitrary content but always live under a
 * named, validated parent — there is no untyped escape hatch at the top.
 */

const ALL_LAYER_KEYS = ['K', 'I', 'O', 'C', 'E', 'P', 'L', 'H', 'N', 'S', 'AI'] as const;

export const intelligenceLayersSchema = z
  .object({
    K: knowledgeLayerSchema.optional(),
    I: informationLayerSchema.optional(),
    O: observationLayerSchema.optional(),
    C: contextLayerSchema.optional(),
    E: experienceLayerSchema.optional(),
    P: probabilityLayerSchema.optional(),
    L: learningLayerSchema.optional(),
  })
  .strict();

export const nexusLayersSchema = z
  .object({
    H: humanLayerSchema.optional(),
    N: natureLayerSchema.optional(),
    S: scienceLayerSchema.optional(),
    AI: aiLayerSchema.optional(),
  })
  .strict();

export const omegaOptionsSchema = z
  .object({
    disableLayers: z.array(z.enum(ALL_LAYER_KEYS)).optional(),
    timeoutMs: z.number().int().positive().optional(),
    trace: z.enum(['minimal', 'standard', 'verbose']).optional(),
  })
  .strict();

export const omegaInputSchema = z
  .object({
    query: z.string().min(1),
    domain: z.string().min(1),
    layers: intelligenceLayersSchema.default({}),
    nexus: nexusLayersSchema.optional(),
    options: omegaOptionsSchema.optional(),
  })
  .strict();

export type IntelligenceLayersInput = z.infer<typeof intelligenceLayersSchema>;
export type NexusLayersInput = z.infer<typeof nexusLayersSchema>;
export type OmegaOptionsInput = z.infer<typeof omegaOptionsSchema>;
export type OmegaInputPayload = z.infer<typeof omegaInputSchema>;
