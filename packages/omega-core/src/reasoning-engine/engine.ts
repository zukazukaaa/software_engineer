/**
 * OmegaEngine — public reasoning entry point.
 *
 * IMMUTABLE: this class implements the ΩE laws. Changing the order of
 * operations (Ω → ΩN → ΩE) is a breaking semantic change and must go through
 * a deliberate migration.
 *
 * Domain ownership lives entirely in {@link DomainRegistry}. The engine
 * delegates registration, lookup, and listing to the registry so there is a
 * single source of truth for plug-ins. A registry can be injected via
 * {@link OmegaEngineOptions.domainRegistry}; if omitted the engine creates
 * its own.
 */

import { DomainRegistry } from '../domain-registry/registry.js';
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
  /**
   * Inject a shared DomainRegistry. Useful when the registry is owned by an
   * outer module (DI, tests, multi-engine setups). If omitted the engine
   * creates a private registry on construction.
   */
  domainRegistry?: DomainRegistry;
}

export class OmegaEngine {
  private readonly intelligence: Record<IntelligenceLayerKey, IntelligenceLayer>;
  private readonly nexus: Record<NexusLayerKey, NexusLayer>;
  private readonly domainRegistry: DomainRegistry;
  private readonly onStep?: (step: ReasoningStep) => void;

  constructor(opts: OmegaEngineOptions = {}) {
    this.intelligence = { ...DEFAULT_INTELLIGENCE_LAYERS, ...(opts.intelligenceLayers ?? {}) };
    this.nexus = { ...DEFAULT_NEXUS_LAYERS, ...(opts.nexusLayers ?? {}) };
    this.domainRegistry = opts.domainRegistry ?? new DomainRegistry();
    this.onStep = opts.onStep;
  }

  /** Read-only access to the underlying registry. */
  get registry(): DomainRegistry {
    return this.domainRegistry;
  }

  registerDomain(domain: DomainAdapter): void {
    this.domainRegistry.register(domain);
  }

  unregisterDomain(name: string): boolean {
    return this.domainRegistry.unregister(name);
  }

  hasDomain(name: string): boolean {
    return this.domainRegistry.isActive(name);
  }

  listDomains(): DomainAdapter[] {
    return this.domainRegistry
      .list()
      .filter((entry) => entry.active)
      .map((entry) => entry.adapter);
  }

  getDomain(name: string): DomainAdapter | undefined {
    return this.domainRegistry.get(name);
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
