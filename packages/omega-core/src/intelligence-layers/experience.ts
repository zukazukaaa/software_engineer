import type {
  ExperienceLayer,
  IntelligenceLayer,
  LayerContribution,
  LayerExecutionContext,
} from '../types.js';
import { clamp01, empty, weightedMean } from './_helpers.js';

/**
 * E — Experience layer. Past patterns retrieved (ideally) from a vector DB.
 */
export class Experience implements IntelligenceLayer<'E'> {
  readonly key = 'E' as const;
  readonly version = '1.0.0';

  async process(
    payload: ExperienceLayer | undefined,
    _ctx: LayerExecutionContext,
  ): Promise<LayerContribution> {
    if (!payload || payload.patterns.length === 0) {
      return empty('E: no experience patterns');
    }

    // Similarity acts as a weight; weight × similarity → contribution.
    const signal = weightedMean(
      payload.patterns.map((p) => ({
        value: clamp01(p.weight),
        weight: clamp01(p.similarity ?? 1),
      })),
    );
    return {
      signal: clamp01(signal),
      uncertainty: clamp01(1 - signal),
      notes: `E: ${payload.patterns.length} patterns matched`,
    };
  }
}
