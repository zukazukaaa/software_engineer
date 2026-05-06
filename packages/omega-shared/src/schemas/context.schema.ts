import { z } from 'zod';

/**
 * C — Context layer.
 * Scope + constraints narrow the decision space.
 *
 * `scope` is a free-form bag of environmental keys (`z.record(string,
 * unknown)`). Constraints are strict objects with an enum operator.
 */

export const contextConstraintSchema = z
  .object({
    key: z.string().min(1),
    operator: z.enum(['=', '!=', '<', '>', 'in', 'between']),
    /** Operator-specific payload (scalar, array for `in`, [lo, hi] for `between`). */
    value: z.unknown(),
  })
  .strict();

export const contextLayerSchema = z
  .object({
    domain: z.string().min(1),
    scope: z.record(z.string(), z.unknown()),
    constraints: z.array(contextConstraintSchema),
  })
  .strict();

export type ContextConstraintInput = z.infer<typeof contextConstraintSchema>;
export type ContextLayerInput = z.infer<typeof contextLayerSchema>;
