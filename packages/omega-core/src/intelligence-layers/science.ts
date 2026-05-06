import type {
  LayerContribution,
  LayerExecutionContext,
  NexusLayer,
  OmegaResult,
  ScienceLayer as SciencePayload,
} from '../types.js';
import { clamp01, empty, weightedMean } from './_helpers.js';

/**
 * S — Scientific method layer. Frameworks + citations validate Ω.
 */
export class Science implements NexusLayer<'S'> {
  readonly key = 'S' as const;
  readonly version = '1.0.0';

  async process(
    payload: SciencePayload | undefined,
    _ctx: LayerExecutionContext,
    _omega: OmegaResult,
  ): Promise<LayerContribution> {
    if (!payload || (payload.frameworks.length === 0 && payload.citations.length === 0)) {
      return empty('S: no scientific framing');
    }

    const citationSignal = weightedMean(
      payload.citations.map((c) => ({ value: clamp01(c.weight), weight: 1 })),
    );
    const frameworkSignal = clamp01(payload.frameworks.length / 3);
    const signal = clamp01(
      (citationSignal + frameworkSignal) / (payload.citations.length > 0 ? 2 : 1),
    );
    return {
      signal,
      uncertainty: clamp01(1 - signal),
      notes: `S: ${payload.frameworks.length} frameworks, ${payload.citations.length} citations`,
    };
  }
}
