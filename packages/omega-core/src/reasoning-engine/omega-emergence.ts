/**
 * ΩE = ΩN − Ω
 *
 * The emergent layer is the *gap* between nexus-amplified reasoning and the
 * raw intelligence product. A non-trivial gap indicates novel insight that
 * arose from the human/nature/science/AI overlay — exactly what we want.
 */

import type {
  Alternative,
  EmergencePattern,
  NexusResult,
  OmegaOutput,
  OmegaResult,
  ReasoningStep,
} from '../types.js';
import { clamp01, confidenceFromUncertainty } from './uncertainty.js';

export interface EmergenceComputeArgs {
  query: string;
  domain: string;
  omega: OmegaResult;
  nexus: NexusResult;
  steps: ReasoningStep[];
  startTimestamp: Date;
  cost: number;
  startHr: number;
}

export const computeEmergence = (args: EmergenceComputeArgs): OmegaOutput => {
  const gap = clamp01(Math.abs(args.nexus.amplified - args.omega.product));

  // Final uncertainty: combined residual, but bounded below by the engine's
  // ability to disagree with itself — pure agreement (gap == 0) means no
  // emergent value, which is itself an uncertainty signal of its own.
  const finalUncertainty = clamp01(args.nexus.uncertainty);
  const confidence = confidenceFromUncertainty(finalUncertainty);

  const novelInsights: string[] = [];
  const tensions: string[] = [];

  for (const step of args.steps) {
    if (step.uncertaintyDelta > 0.1) {
      novelInsights.push(`${step.layer} reduced U by ${step.uncertaintyDelta.toFixed(2)}`);
    } else if (step.uncertaintyDelta < 0) {
      tensions.push(`${step.layer} added uncertainty (${(-step.uncertaintyDelta).toFixed(2)})`);
    }
  }

  const emergence: EmergencePattern = {
    novelInsights,
    tensions,
    magnitude: gap,
  };

  // Decision is provisional — the engine reports a structured answer; the
  // domain adapter is expected to reformat for its own needs.
  const decision = {
    summary: `ΩE reasoning over "${args.query}" (domain=${args.domain})`,
    omegaProduct: args.omega.product,
    nexusAmplified: args.nexus.amplified,
    emergenceMagnitude: gap,
    confidence,
  };

  // Alternatives surface high-uncertainty layers as competing hypotheses.
  const alternatives: Alternative[] = args.steps
    .filter((s) => s.uncertaintyAfter > 0.5)
    .slice(0, 3)
    .map((s) => ({
      decision: { layer: s.layer, fallback: s.output },
      confidence: confidenceFromUncertainty(s.uncertaintyAfter),
      rationale: `${s.layer} layer remains uncertain after processing`,
    }));

  const layersUsed = args.steps.map((s) => s.layer);
  const latency = Math.round(performance.now() - args.startHr);

  return {
    decision,
    uncertainty: finalUncertainty,
    confidence,
    reasoning: args.steps,
    alternatives,
    emergence,
    metadata: {
      domain: args.domain,
      timestamp: args.startTimestamp,
      layersUsed,
      cost: args.cost,
      latency,
    },
  };
};
