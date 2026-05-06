import type {
  LayerContribution,
  LayerExecutionContext,
  NatureLayer as NaturePayload,
  NexusLayer,
  OmegaResult,
} from '../types.js';
import { clamp01, empty } from './_helpers.js';

/**
 * N — Nature logic layer. Invariants and natural laws asserted to hold.
 */
export class Nature implements NexusLayer<'N'> {
  readonly key = 'N' as const;
  readonly version = '1.0.0';

  async process(
    payload: NaturePayload | undefined,
    _ctx: LayerExecutionContext,
    _omega: OmegaResult,
  ): Promise<LayerContribution> {
    if (!payload || payload.laws.length === 0) {
      return empty('N: no natural laws asserted');
    }

    // Natural laws are high-trust by definition; signal ~ count saturating at 5.
    const signal = clamp01(payload.laws.length / 5);
    return {
      signal,
      uncertainty: clamp01(1 - signal),
      notes: `N: ${payload.laws.length} laws (${payload.laws.slice(0, 3).join(', ')})`,
    };
  }
}
