import type {
  AILayer as AIPayload,
  LayerContribution,
  LayerExecutionContext,
  NexusLayer,
  OmegaResult,
} from '../types.js';
import { clamp01, empty, weightedMean } from './_helpers.js';

/**
 * AI — Artificial intelligence layer. Aggregates one or more LLM invocations.
 *
 * Cross-validation principle: agreement across providers reduces uncertainty;
 * disagreement raises it.
 */
export class AI implements NexusLayer<'AI'> {
  readonly key = 'AI' as const;
  readonly version = '1.0.0';

  async process(
    payload: AIPayload | undefined,
    _ctx: LayerExecutionContext,
    _omega: OmegaResult,
  ): Promise<LayerContribution> {
    if (!payload || payload.models.length === 0) {
      return empty('AI: no model invocations');
    }

    const meanConfidence = weightedMean(
      payload.models.map((m) => ({ value: clamp01(m.confidence), weight: 1 })),
    );

    // Penalize relying on a single model: cross-validation bonus saturates at 3.
    const diversity = clamp01(payload.models.length / 3);
    const signal = clamp01(meanConfidence * (0.7 + 0.3 * diversity));

    const providers = Array.from(new Set(payload.models.map((m) => m.provider))).join(', ');
    return {
      signal,
      uncertainty: clamp01(1 - signal),
      notes: `AI: ${payload.models.length} model(s) [${providers}]`,
    };
  }
}
