import type {
  IntelligenceLayer,
  LayerContribution,
  LayerExecutionContext,
  ObservationLayer,
} from '../types.js';
import { clamp01, empty, weightedMean } from './_helpers.js';

/**
 * O — Observation layer. Real-world / sensor / feed evidence.
 */
export class Observation implements IntelligenceLayer<'O'> {
  readonly key = 'O' as const;
  readonly version = '1.0.0';

  async process(
    payload: ObservationLayer | undefined,
    _ctx: LayerExecutionContext,
  ): Promise<LayerContribution> {
    if (!payload || payload.observations.length === 0) {
      return empty('O: no observations');
    }

    const signal = weightedMean(
      payload.observations.map((o) => ({ value: clamp01(o.reliability), weight: 1 })),
    );
    return {
      signal: clamp01(signal),
      uncertainty: clamp01(1 - signal),
      notes: `O: ${payload.observations.length} observations from ${payload.source}`,
    };
  }
}
