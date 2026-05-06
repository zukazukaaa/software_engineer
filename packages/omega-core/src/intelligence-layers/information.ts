import type {
  InformationLayer,
  IntelligenceLayer,
  LayerContribution,
  LayerExecutionContext,
} from '../types.js';
import { clamp01, empty, weightedMean } from './_helpers.js';

/**
 * I — Information layer. Normalized input signals.
 */
export class Information implements IntelligenceLayer<'I'> {
  readonly key = 'I' as const;
  readonly version = '1.0.0';

  async process(
    payload: InformationLayer | undefined,
    _ctx: LayerExecutionContext,
  ): Promise<LayerContribution> {
    if (!payload || payload.signals.length === 0) {
      return empty('I: no information signals');
    }

    const signal = weightedMean(
      payload.signals.map((s) => ({ value: clamp01(s.confidence), weight: 1 })),
    );
    return {
      signal: clamp01(signal),
      uncertainty: clamp01(1 - signal),
      notes: `I: ${payload.signals.length} signals`,
    };
  }
}
