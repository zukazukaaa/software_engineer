import { z } from 'zod';

/**
 * AI — Artificial intelligence layer.
 * Aggregates one or more LLM invocations. The provider enum is closed to
 * the four supported integrations (anthropic, openai, gemini, mock).
 */

export const AI_PROVIDERS = ['anthropic', 'openai', 'gemini', 'mock'] as const;

export const aiModelInvocationSchema = z
  .object({
    provider: z.enum(AI_PROVIDERS),
    model: z.string().min(1),
    output: z.string(),
    /** Self-reported or post-hoc model confidence, 0..1. */
    confidence: z.number().min(0).max(1),
    /** Optional cost in USD. */
    cost: z.number().nonnegative().optional(),
    latencyMs: z.number().int().nonnegative().optional(),
  })
  .strict();

export const aiLayerSchema = z
  .object({
    models: z.array(aiModelInvocationSchema),
  })
  .strict();

export type AIModelInvocationInput = z.infer<typeof aiModelInvocationSchema>;
export type AILayerInput = z.infer<typeof aiLayerSchema>;
