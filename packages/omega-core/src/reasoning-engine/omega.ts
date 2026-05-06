/**
 * Ω = lim_{U→0}(K × I × O × C × E × P × L)
 *
 * The Ω operator multiplies the seven intelligence-layer signals into a
 * single product and reports the combined residual uncertainty.
 */

import type {
  IntelligenceLayer,
  IntelligenceLayerKey,
  IntelligenceLayers,
  LayerContribution,
  LayerExecutionContext,
  OmegaResult,
  ReasoningStep,
} from '../types.js';
import { INTELLIGENCE_KEYS } from '../types.js';
import { clamp01, combineUncertainty } from './uncertainty.js';

export interface OmegaComputeArgs {
  query: string;
  domain: string;
  layers: Partial<IntelligenceLayers>;
  registry: Record<IntelligenceLayerKey, IntelligenceLayer>;
  disabled?: Set<IntelligenceLayerKey>;
  onStep?: (step: ReasoningStep) => void;
}

export const computeOmega = async (args: OmegaComputeArgs): Promise<{
  result: OmegaResult;
  steps: ReasoningStep[];
}> => {
  const steps: ReasoningStep[] = [];
  const contributions: Partial<Record<IntelligenceLayerKey, LayerContribution>> = {};
  let uncertainty = 1;

  for (const key of INTELLIGENCE_KEYS) {
    if (args.disabled?.has(key)) continue;
    const layer = args.registry[key];
    const payload = args.layers[key];

    const ctx: LayerExecutionContext = {
      query: args.query,
      domain: args.domain,
      layers: args.layers,
      nexus: {},
      uncertainty,
    };

    const t0 = performance.now();
    const contribution = await layer.process(payload as never, ctx);
    const durationMs = performance.now() - t0;

    contributions[key] = contribution;
    const before = uncertainty;
    uncertainty = combineUncertainty([uncertainty, contribution.uncertainty]);

    const step: ReasoningStep = {
      layer: key,
      input: payload ?? null,
      output: contribution,
      uncertaintyBefore: before,
      uncertaintyAfter: uncertainty,
      uncertaintyDelta: before - uncertainty,
      reasoning: contribution.notes,
      durationMs,
    };
    steps.push(step);
    args.onStep?.(step);
  }

  // Product of signals — not used for the decision directly, but reported.
  const product = INTELLIGENCE_KEYS.filter((k) => !args.disabled?.has(k)).reduce((acc, k) => {
    const c = contributions[k];
    return c ? acc * clamp01(c.signal) : acc;
  }, 1);

  return {
    result: {
      product,
      uncertainty,
      contributions: contributions as OmegaResult['contributions'],
    },
    steps,
  };
};
