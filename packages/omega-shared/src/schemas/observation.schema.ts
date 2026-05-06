import { z } from 'zod';

/**
 * O — Observation layer.
 * Real-world / sensor / feed evidence. Each observation has a `channel`
 * discriminator naming the source (sensor/feed/manual/...) plus an opaque
 * `value` payload.
 */

export const observationRecordSchema = z
  .object({
    id: z.string().min(1),
    /** Discriminator: 'sensor', 'feed', 'manual', etc. */
    channel: z.string().min(1),
    /** Free-form value; channel-specific. */
    value: z.unknown(),
    /** Reliability of this observation, 0..1. */
    reliability: z.number().min(0).max(1),
  })
  .strict();

export const observationLayerSchema = z
  .object({
    observations: z.array(observationRecordSchema),
    source: z.string().min(1),
    /** Accepts ISO 8601 strings or Date instances. */
    capturedAt: z.coerce.date(),
  })
  .strict();

export type ObservationRecordInput = z.infer<typeof observationRecordSchema>;
export type ObservationLayerInput = z.infer<typeof observationLayerSchema>;
