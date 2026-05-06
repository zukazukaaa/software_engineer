import type {
  HumanLayer as HumanPayload,
  LayerContribution,
  LayerExecutionContext,
  NexusLayer,
  OmegaResult,
} from '../types.js';
import { clamp01, empty } from './_helpers.js';

/**
 * H — Human reasoning layer. Hypotheses contributed by a human operator.
 */
export class Human implements NexusLayer<'H'> {
  readonly key = 'H' as const;
  readonly version = '1.0.0';

  async process(
    payload: HumanPayload | undefined,
    _ctx: LayerExecutionContext,
    _omega: OmegaResult,
  ): Promise<LayerContribution> {
    if (!payload || payload.reasoning.trim() === '') {
      return empty('H: no human input');
    }

    const signal = clamp01(payload.weight);
    return {
      signal,
      uncertainty: clamp01(1 - signal),
      notes: `H: ${payload.hypotheses.length} hypotheses, weight ${signal.toFixed(2)}`,
    };
  }
}
