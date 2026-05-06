import type {
  IntelligenceLayer,
  KnowledgeLayer,
  LayerContribution,
  LayerExecutionContext,
} from '../types.js';
import { clamp01, empty, weightedMean } from './_helpers.js';

/**
 * K — Knowledge layer.
 *
 * Domain-supplied facts and rules. The contribution strength is the
 * weighted-mean confidence of available facts; uncertainty is its complement.
 */
export class Knowledge implements IntelligenceLayer<'K'> {
  readonly key = 'K' as const;
  readonly version = '1.0.0';

  async process(
    payload: KnowledgeLayer | undefined,
    _ctx: LayerExecutionContext,
  ): Promise<LayerContribution> {
    if (!payload || (payload.facts.length === 0 && payload.rules.length === 0)) {
      return empty('K: no knowledge available');
    }

    const factSignal = weightedMean(
      payload.facts.map((f) => ({ value: clamp01(f.weight), weight: 1 })),
    );
    const ruleSignal = weightedMean(
      payload.rules.map((r) => ({ value: clamp01(r.weight), weight: 1 })),
    );

    const signal = clamp01((factSignal + ruleSignal) / (payload.rules.length > 0 ? 2 : 1));
    return {
      signal,
      uncertainty: clamp01(1 - signal),
      notes: `K: ${payload.facts.length} facts, ${payload.rules.length} rules`,
    };
  }
}
