/**
 * ΩN = (H + N + S + AI) × Ω
 *
 * Nexus layers are additive among themselves, then multiplied with the Ω
 * signal. This expresses "human + nature + science + AI amplify the
 * intelligence product".
 */

import type {
  LayerContribution,
  LayerExecutionContext,
  NexusLayer,
  NexusLayerKey,
  NexusLayers,
  NexusResult,
  OmegaResult,
  ReasoningStep,
  IntelligenceLayers,
} from '../types.js';
import { NEXUS_KEYS } from '../types.js';
import { clamp01, combineUncertainty } from './uncertainty.js';

export interface NexusComputeArgs {
  query: string;
  domain: string;
  intelligenceLayers: Partial<IntelligenceLayers>;
  nexusPayloads: Partial<NexusLayers>;
  registry: Record<NexusLayerKey, NexusLayer>;
  omega: OmegaResult;
  disabled?: Set<NexusLayerKey>;
  onStep?: (step: ReasoningStep) => void;
}

export const computeNexus = async (args: NexusComputeArgs): Promise<{
  result: NexusResult;
  steps: ReasoningStep[];
}> => {
  const steps: ReasoningStep[] = [];
  const contributions: Partial<Record<NexusLayerKey, LayerContribution>> = {};

  let uncertainty = args.omega.uncertainty;

  for (const key of NEXUS_KEYS) {
    if (args.disabled?.has(key)) continue;
    const layer = args.registry[key];
    const payload = args.nexusPayloads[key];

    const ctx: LayerExecutionContext = {
      query: args.query,
      domain: args.domain,
      layers: args.intelligenceLayers,
      nexus: args.nexusPayloads,
      uncertainty,
    };

    const t0 = performance.now();
    const contribution = await layer.process(payload as never, ctx, args.omega);
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

  // Sum of nexus signals (mean to keep in [0,1]) × Ω product.
  const active = NEXUS_KEYS.filter((k) => !args.disabled?.has(k));
  const sum = active.reduce((acc, k) => acc + clamp01(contributions[k]?.signal ?? 0), 0);
  const nexusMean = active.length > 0 ? sum / active.length : 0;
  const amplified = clamp01(nexusMean * args.omega.product);

  return {
    result: {
      amplified,
      uncertainty,
      contributions: contributions as NexusResult['contributions'],
    },
    steps,
  };
};
