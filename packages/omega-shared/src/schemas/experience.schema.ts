import { z } from 'zod';

/**
 * E — Experience layer.
 * Past patterns retrieved (typically) from a vector DB. `outcome` is opaque
 * because each domain's outcome shape differs.
 */

export const experiencePatternSchema = z
  .object({
    id: z.string().min(1),
    description: z.string(),
    /** Pattern's intrinsic weight, 0..1. */
    weight: z.number().min(0).max(1),
    /** Domain-specific outcome payload. */
    outcome: z.unknown(),
    /** Cosine/embedding similarity if produced by retrieval, 0..1. */
    similarity: z.number().min(0).max(1).optional(),
  })
  .strict();

export const experienceLayerSchema = z
  .object({
    patterns: z.array(experiencePatternSchema),
  })
  .strict();

export type ExperiencePatternInput = z.infer<typeof experiencePatternSchema>;
export type ExperienceLayerInput = z.infer<typeof experienceLayerSchema>;
