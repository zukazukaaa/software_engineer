import { z } from 'zod';

/**
 * N — Nature logic layer.
 * Asserted natural laws ('gravity', 'thermodynamics', 'evolution', ...) plus
 * an open `invariants` bag. Invariants are domain-specific constants that
 * the layer will treat as ground truth.
 */

export const natureLayerSchema = z
  .object({
    laws: z.array(z.string().min(1)),
    invariants: z.record(z.string(), z.unknown()),
  })
  .strict();

export type NatureLayerInput = z.infer<typeof natureLayerSchema>;
