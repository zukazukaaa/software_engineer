import { z } from 'zod';

/**
 * H — Human reasoning layer.
 * Hypotheses and reasoning text contributed by a human operator.
 */

export const humanLayerSchema = z
  .object({
    reasoning: z.string().min(1),
    hypotheses: z.array(z.string().min(1)),
    /** Operator-asserted weight, 0..1. */
    weight: z.number().min(0).max(1),
  })
  .strict();

export type HumanLayerInput = z.infer<typeof humanLayerSchema>;
