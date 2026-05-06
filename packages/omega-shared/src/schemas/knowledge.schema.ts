import { z } from 'zod';

/**
 * K — Knowledge layer.
 * Domain-supplied facts and rules.
 */

export const knowledgeFactSchema = z
  .object({
    id: z.string().min(1),
    statement: z.string().min(1),
    /** Confidence in this fact, 0..1. */
    weight: z.number().min(0).max(1),
    /** Pre-computed embedding, optional. */
    embedding: z.array(z.number()).optional(),
  })
  .strict();

export const knowledgeRuleSchema = z
  .object({
    id: z.string().min(1),
    when: z.string().min(1),
    then: z.string().min(1),
    weight: z.number().min(0).max(1),
  })
  .strict();

export const knowledgeLayerSchema = z
  .object({
    facts: z.array(knowledgeFactSchema),
    rules: z.array(knowledgeRuleSchema),
    source: z.string().optional(),
  })
  .strict();

export type KnowledgeFactInput = z.infer<typeof knowledgeFactSchema>;
export type KnowledgeRuleInput = z.infer<typeof knowledgeRuleSchema>;
export type KnowledgeLayerInput = z.infer<typeof knowledgeLayerSchema>;
