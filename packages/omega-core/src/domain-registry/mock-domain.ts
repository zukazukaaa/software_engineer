/**
 * MockDomain — used in tests and Phase 2 plug-in verification.
 *
 * It is intentionally trivial; the only requirement is that `DomainAdapter`
 * is a plug-in interface that ΩE Core can drive without knowing anything
 * about the domain.
 */

import type {
  ContextLayer,
  DomainAdapter,
  KnowledgeLayer,
  ObservationLayer,
  OmegaOutput,
  ProbabilityLayer,
} from '../types.js';

export class MockDomain implements DomainAdapter {
  readonly name = 'mock';
  readonly version = '0.1.0';

  async loadKnowledge(): Promise<KnowledgeLayer> {
    return {
      facts: [{ id: 'f1', statement: 'mock fact', weight: 0.8 }],
      rules: [{ id: 'r1', when: 'always', then: 'mock-true', weight: 0.7 }],
      source: 'mock',
    };
  }

  async getObservations(_query: string): Promise<ObservationLayer> {
    return {
      observations: [
        { id: 'o1', channel: 'mock', value: 42, reliability: 0.9 },
      ],
      source: 'mock',
      capturedAt: new Date(),
    };
  }

  async buildContext(_query: string): Promise<ContextLayer> {
    return {
      domain: this.name,
      scope: { mock: true },
      constraints: [],
    };
  }

  async buildProbabilityModel(_data: unknown): Promise<ProbabilityLayer> {
    return {
      distributions: [
        {
          variable: 'mock-outcome',
          outcomes: [
            { value: 'a', p: 0.6 },
            { value: 'b', p: 0.3 },
            { value: 'c', p: 0.1 },
          ],
        },
      ],
    };
  }

  formatOutput(omegaOutput: OmegaOutput): unknown {
    return {
      adapter: this.name,
      decision: omegaOutput.decision,
      confidence: omegaOutput.confidence,
    };
  }
}
