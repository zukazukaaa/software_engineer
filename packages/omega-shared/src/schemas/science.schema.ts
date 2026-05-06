import { z } from 'zod';

/**
 * S — Scientific method layer.
 * Reasoning frameworks ('bayesian', 'falsifiability', 'control-experiment',
 * ...) plus optional citations.
 */

export const scienceCitationSchema = z
  .object({
    title: z.string().min(1),
    url: z.string().url().optional(),
    /** Editorial weight assigned to this citation, 0..1. */
    weight: z.number().min(0).max(1),
  })
  .strict();

export const scienceLayerSchema = z
  .object({
    frameworks: z.array(z.string().min(1)),
    citations: z.array(scienceCitationSchema),
  })
  .strict();

export type ScienceCitationInput = z.infer<typeof scienceCitationSchema>;
export type ScienceLayerInput = z.infer<typeof scienceLayerSchema>;
