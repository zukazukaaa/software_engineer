import { describe, expect, it } from 'vitest';
import { OmegaEngine } from '../reasoning-engine/index.js';
import { MockDomain } from '../domain-registry/index.js';
import type { OmegaInput } from '../types.js';

describe('OmegaEngine', () => {
  it('runs the full Ω → ΩN → ΩE pipeline with mock data', async () => {
    const engine = new OmegaEngine();
    const domain = new MockDomain();

    const [knowledge, observations, context, probability] = await Promise.all([
      domain.loadKnowledge(),
      domain.getObservations('test query'),
      domain.buildContext('test query'),
      domain.buildProbabilityModel(null),
    ]);

    const input: OmegaInput = {
      query: 'test query',
      domain: domain.name,
      layers: {
        K: knowledge,
        O: observations,
        C: context,
        P: probability,
        I: { raw: null, normalized: {}, signals: [{ key: 'a', value: 1, confidence: 0.7 }] },
        E: { patterns: [{ id: 'p', description: '', weight: 0.6, outcome: null, similarity: 0.8 }] },
        L: { feedback: { correct: 8, total: 10, accuracy: 0.8 }, adjustments: [] },
      },
      nexus: {
        H: { reasoning: 'looks right', hypotheses: ['h1'], weight: 0.6 },
        N: { laws: ['conservation'], invariants: {} },
        S: { frameworks: ['bayesian'], citations: [] },
        AI: {
          models: [
            {
              provider: 'mock',
              model: 'test',
              output: 'ok',
              confidence: 0.7,
            },
          ],
        },
      },
    };

    const out = await engine.reason(input);
    expect(out.confidence).toBeGreaterThan(0);
    expect(out.confidence).toBeLessThanOrEqual(1);
    expect(out.uncertainty).toBeGreaterThanOrEqual(0);
    expect(out.uncertainty).toBeLessThanOrEqual(1);
    expect(out.reasoning.length).toBe(11); // 7 intelligence + 4 nexus
    expect(out.metadata.domain).toBe('mock');
  });

  it('registers and looks up domains', () => {
    const engine = new OmegaEngine();
    const domain = new MockDomain();
    engine.registerDomain(domain);
    expect(engine.hasDomain('mock')).toBe(true);
    expect(engine.listDomains()).toHaveLength(1);
    expect(() => engine.registerDomain(domain)).toThrow();
    expect(engine.unregisterDomain('mock')).toBe(true);
  });
});
