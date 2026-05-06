import { z } from 'zod';

/**
 * P — Probability layer.
 * Distributions over named variables. Each outcome is a (value, p) pair.
 *
 * The layer does not require Σp == 1 — domains may submit unnormalized
 * weights — but each individual `p` is bounded to [0, 1].
 */

export const probabilityOutcomeSchema = z
  .object({
    /** Outcome label; type is domain-specific. */
    value: z.unknown(),
    /** Probability mass (or normalized weight), 0..1. */
    p: z.number().min(0).max(1),
  })
  .strict();

export const probabilityDistributionSchema = z
  .object({
    variable: z.string().min(1),
    outcomes: z.array(probabilityOutcomeSchema),
  })
  .strict();

export const probabilityLayerSchema = z
  .object({
    distributions: z.array(probabilityDistributionSchema),
  })
  .strict();

export type ProbabilityOutcomeInput = z.infer<typeof probabilityOutcomeSchema>;
export type ProbabilityDistributionInput = z.infer<typeof probabilityDistributionSchema>;
export type ProbabilityLayerInput = z.infer<typeof probabilityLayerSchema>;
