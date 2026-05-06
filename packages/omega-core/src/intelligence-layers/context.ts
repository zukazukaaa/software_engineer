import type {
  ContextLayer,
  IntelligenceLayer,
  LayerContribution,
  LayerExecutionContext,
} from '../types.js';
import { clamp01, empty } from './_helpers.js';

/**
 * C — Context layer. Scope + constraints narrow the decision space.
 */
export class Context implements IntelligenceLayer<'C'> {
  readonly key = 'C' as const;
  readonly version = '1.0.0';

  async process(
    payload: ContextLayer | undefined,
    _ctx: LayerExecutionContext,
  ): Promise<LayerContribution> {
    if (!payload) {
      return empty('C: no context');
    }

    const scopeKeys = Object.keys(payload.scope).length;
    const constraintCount = payload.constraints.length;
    // More context narrows the space; saturate at ~10 features.
    const richness = clamp01((scopeKeys + constraintCount) / 10);
    return {
      signal: richness,
      uncertainty: clamp01(1 - richness),
      notes: `C: ${scopeKeys} scope keys, ${constraintCount} constraints`,
    };
  }
}
