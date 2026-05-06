import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InMemoryAuthStore } from '../auth/in-memory-store.js';
import { type TokenConfig } from '../auth/tokens.js';
import { NoopRateLimiter } from '../rate-limit/noop.js';
import { buildServer } from '../server.js';

const TEST_TOKEN_CONFIG: TokenConfig = {
  accessSecret: 'test-access-secret',
  refreshSecret: 'test-refresh-secret',
  accessExpiresIn: '15m',
  refreshExpiresIn: '7d',
};

let app: Awaited<ReturnType<typeof buildServer>>;
let apiKey: string;

beforeAll(async () => {
  app = await buildServer({
    authStore: new InMemoryAuthStore(),
    rateLimiter: new NoopRateLimiter(),
    tokenConfig: TEST_TOKEN_CONFIG,
  });
  const reg = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email: 'validator@example.com', password: 'Secret123' },
  });
  apiKey = reg.json().apiKey.token;
});

afterAll(async () => {
  await app.close();
});

const authHeaders = () => ({ 'x-api-key': apiKey });

describe('POST /api/omega/reason — strict validation (authenticated)', () => {
  it('200 happy path: full valid payload returns the 11-step ΩE chain', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/omega/reason',
      headers: authHeaders(),
      payload: {
        query: 'will it rain tomorrow?',
        domain: 'mock',
        layers: {
          K: {
            facts: [{ id: 'f1', statement: 'cumulus seen', weight: 0.7 }],
            rules: [{ id: 'r1', when: 'cumulus', then: 'rain', weight: 0.6 }],
          },
          I: {
            raw: { sample: 1 },
            normalized: { humidity: 0.8 },
            signals: [{ key: 'humidity', value: 0.8, confidence: 0.9 }],
          },
          O: {
            observations: [
              { id: 'o1', channel: 'sensor', value: 0.8, reliability: 0.95 },
            ],
            source: 'station-A',
            capturedAt: new Date().toISOString(),
          },
          C: {
            domain: 'weather',
            scope: { region: 'TBS' },
            constraints: [{ key: 'tomorrow', operator: '=', value: true }],
          },
          E: {
            patterns: [
              {
                id: 'p1',
                description: 'similar humid morning → rain',
                weight: 0.7,
                outcome: 'rain',
                similarity: 0.82,
              },
            ],
          },
          P: {
            distributions: [
              {
                variable: 'precipitation',
                outcomes: [
                  { value: 'rain', p: 0.7 },
                  { value: 'dry', p: 0.3 },
                ],
              },
            ],
          },
          L: {
            feedback: { correct: 8, total: 10, accuracy: 0.8 },
            adjustments: [],
          },
        },
        nexus: {
          H: { reasoning: 'looks plausible', hypotheses: ['rain'], weight: 0.6 },
          N: { laws: ['conservation-of-mass'], invariants: {} },
          S: { frameworks: ['bayesian'], citations: [] },
          AI: {
            models: [
              { provider: 'mock', model: 'test', output: 'rain', confidence: 0.7 },
            ],
          },
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.reasoning).toHaveLength(11);
    expect(body.metadata.domain).toBe('mock');
  });

  it('400 missing required field: K.facts[0].weight', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/omega/reason',
      headers: authHeaders(),
      payload: {
        query: 'q',
        domain: 'mock',
        layers: {
          K: {
            facts: [{ id: 'f1', statement: 's' }],
            rules: [],
          },
        },
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBe('invalid_request');
    const weightIssue = body.issues.find((i: { path: string }) =>
      i.path.endsWith('layers.K.facts.0.weight'),
    );
    expect(weightIssue).toBeDefined();
    expect(weightIssue.layer).toBe('K');
    expect(weightIssue.code).toBe('invalid_type');
  });

  it('400 wrong type: AI.models[0].confidence > 1', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/omega/reason',
      headers: authHeaders(),
      payload: {
        query: 'q',
        domain: 'mock',
        layers: {},
        nexus: {
          AI: {
            models: [
              { provider: 'mock', model: 'm', output: 'x', confidence: 5 },
            ],
          },
        },
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBe('invalid_request');
    const confIssue = body.issues.find((i: { path: string }) =>
      i.path.endsWith('nexus.AI.models.0.confidence'),
    );
    expect(confIssue).toBeDefined();
    expect(confIssue.layer).toBe('AI');
    expect(confIssue.code).toBe('too_big');
  });

  it('400 extra unknown field: layers.K.foo', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/omega/reason',
      headers: authHeaders(),
      payload: {
        query: 'q',
        domain: 'mock',
        layers: {
          K: { facts: [], rules: [], foo: 'bar' },
        },
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBe('invalid_request');
    const extraIssue = body.issues.find((i: { code: string }) => i.code === 'unrecognized_keys');
    expect(extraIssue).toBeDefined();
    expect(extraIssue.layer).toBe('K');
  });
});
