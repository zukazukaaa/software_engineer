import { z } from 'zod';

/**
 * I — Information layer.
 * Normalized input signals plus the raw source.
 *
 * `raw` is intentionally `z.unknown()`: the layer accepts any inbound payload
 * and the layer's own `process()` uses only `signals` for its computation.
 * `normalized` is a free-form bag — domain adapters define its shape — so it
 * is `z.record(z.string(), z.unknown())` (it must be an object, but values
 * are open).
 */

export const informationSignalSchema = z
  .object({
    key: z.string().min(1),
    /** Free-form value; the layer treats it as opaque. */
    value: z.unknown(),
    /** Confidence in this signal, 0..1. */
    confidence: z.number().min(0).max(1),
  })
  .strict();

export const informationLayerSchema = z
  .object({
    raw: z.unknown(),
    normalized: z.record(z.string(), z.unknown()),
    signals: z.array(informationSignalSchema),
  })
  .strict();

export type InformationSignalInput = z.infer<typeof informationSignalSchema>;
export type InformationLayerInput = z.infer<typeof informationLayerSchema>;
