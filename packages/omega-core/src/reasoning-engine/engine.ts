/**
 * OmegaEngine — public reasoning entry point.
 *
 * IMMUTABLE: this class implements the ΩE laws. Changing the order of
 * operations (Ω → ΩN → ΩE) is a breaking semantic change and must go through
 * a deliberate migration.
 */

import {
  DEFAULT_INTELLIGENCE_LAYERS,
  DEFAULT_NEXUS_LAYERS,
} from '../intelligence-layers/index.js';
import type {
  AnyLayerKey,
  AIModelInvocation,
  DomainAdapter,
  IntelligenceLayer,
  IntelligenceLayerKey,
  NexusLayer,
  NexusLayerKey,
  OmegaInput,
  OmegaOutput,
  ReasoningStep,
} from '../types.js';
import { computeEmergence } from './omega-emergence.js';
import { computeNexus } from './omega-nexus.js';
import { computeOmega } from './omega.js';

export interface OmegaEngineOptions {
  intelligenceLayers?: Partial<Record<IntelligenceLayerKey, IntelligenceLayer>>;
  nexusLayers?: Partial<Record<NexusLayerKey, NexusLayer>>;
  onStep?: (step: ReasoningStep) => void;
}

export class OmegaEngine {
  private readonly intelligence: Record<IntelligenceLayerKey, IntelligenceLayer>;
  private readonly nexus: Record<NexusLayerKey, NexusLayer>;
  private readonly domains = new Map<string, DomainAdapter>();
  private readonly onStep?: (step: ReasoningStep) => void;

  constructor(opts: OmegaEngineOptions = {}) {
    this.intelligence = { ...DEFAULT_INTELLIGENCE_LAYERS, ...(opts.intelligenceLayers ?? {}) };
    this.nexus = { ...DEFAULT_NEXUS_LAYERS, ...(opts.nexusLayers ?? {}) };
    this.onStep = opts.onStep;
  }

  registerDomain(domain: DomainAdapter): void {
    if (this.domains.has(domain.name)) {
      throw new Error(`Domain '${domain.name}' already registered`);
    }
    this.domains.set(domain.name, domain);
  }

  unregisterDomain(name: string): boolean {
    return this.domains.delete(name);
  }

  hasDomain(name: string): boolean {
    return this.domains.has(name);
  }

  listDomains(): DomainAdapter[] {
    return Array.from(this.domains.values());
  }

  getDomain(name: string): DomainAdapter | undefined {
    return this.domains.get(name);
  }

  /**
   * Run the full ΩE pipeline:
   *   1. Ω  = lim_{U→0}(K × I × O × C × E × P × L)
   *   2. ΩN = (H + N + S + AI) × Ω
   *   3. ΩE = ΩN − Ω
   */
  async reason(input: OmegaInput): Promise<OmegaOutput> {
    const startedAt = new Date();
    const startHr = performance.now();

    const disabled = new Set<AnyLayerKey>(input.options?.disableLayers ?? []);
    const disabledIntelligence = new Set<IntelligenceLayerKey>(
      Array.from(disabled).filter((k): k is IntelligenceLayerKey =>
        ['K', 'I', 'O', 'C', 'E', 'P', 'L'].includes(k),
      ),
    );
    const disabledNexus = new Set<NexusLayerKey>(
      Array.from(disabled).filter((k): k is NexusLayerKey =>
        ['H', 'N', 'S', 'AI'].includes(k),
      ),
    );

    const omega = await computeOmega({
      query: input.query,
      domain: input.domain,
      layers: input.layers,
      registry: this.intelligence,
      disabled: disabledIntelligence,
      onStep: this.onStep,
    });

    const nexus = await computeNexus({
      query: input.query,
      domain: input.domain,
      intelligenceLayers: input.layers,
      nexusPayloads: input.nexus ?? {},
      registry: this.nexus,
      omega: omega.result,
      disabled: disabledNexus,
      onStep: this.onStep,
    });

    const cost = sumApiCost(input);

    return computeEmergence({
      query: input.query,
      domain: input.domain,
      omega: omega.result,
      nexus: nexus.result,
      steps: [...omega.steps, ...nexus.steps],
      startTimestamp: startedAt,
      cost,
      startHr,
    });
  }
}

const sumApiCost = (input: OmegaInput): number => {
  const invocations: AIModelInvocation[] = input.nexus?.AI?.models ?? [];
  return invocations.reduce((sum, m) => sum + (m.cost ?? 0), 0);
};
