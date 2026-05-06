import type {
  IntelligenceLayer,
  LayerContribution,
  LayerExecutionContext,
  ProbabilityLayer,
} from '../types.js';
import { clamp01, empty } from './_helpers.js';

/**
 * P — Probability layer. Concentrated distributions reduce uncertainty;
 * uniform distributions raise it.
 */
export class Probability implements IntelligenceLayer<'P'> {
  readonly key = 'P' as const;
  readonly version = '1.0.0';

  async process(
    payload: ProbabilityLayer | undefined,
    _ctx: LayerExecutionContext,
  ): Promise<LayerContribution> {
    if (!payload || payload.distributions.length === 0) {
      return empty('P: no probability distributions');
    }

    // For each distribution use peak probability as signal.
    const peaks = payload.distributions.map((dist) => {
      if (dist.outcomes.length === 0) return 0;
      return Math.max(...dist.outcomes.map((o) => clamp01(o.p)));
    });
    const signal = peaks.reduce((a, b) => a + b, 0) / peaks.length;
    return {
      signal: clamp01(signal),
      uncertainty: clamp01(1 - signal),
      notes: `P: ${payload.distributions.length} distributions, peak avg ${signal.toFixed(2)}`,
    };
  }
}
