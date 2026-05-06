import type {
  IntelligenceLayer,
  LayerContribution,
  LayerExecutionContext,
  LearningLayer,
} from '../types.js';
import { clamp01, empty } from './_helpers.js';

/**
 * L — Learning layer. Past feedback accuracy is the engine's self-trust.
 */
export class Learning implements IntelligenceLayer<'L'> {
  readonly key = 'L' as const;
  readonly version = '1.0.0';

  async process(
    payload: LearningLayer | undefined,
    _ctx: LayerExecutionContext,
  ): Promise<LayerContribution> {
    if (!payload || payload.feedback.total === 0) {
      return empty('L: no feedback yet');
    }

    const signal = clamp01(payload.feedback.accuracy);
    return {
      signal,
      uncertainty: clamp01(1 - signal),
      notes: `L: accuracy ${(signal * 100).toFixed(1)}% over ${payload.feedback.total} samples`,
    };
  }
}
