import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
let authStore: InMemoryAuthStore;

beforeEach(async () => {
  authStore = new InMemoryAuthStore();
  app = await buildServer({
    authStore,
    rateLimiter: new NoopRateLimiter(),
    tokenConfig: TEST_TOKEN_CONFIG,
  });
});

afterEach(async () => {
  await app.close();
});

describe('/api/omega/reason — protected', () => {
  it('401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/omega/reason',
      payload: { query: 'q', domain: 'mock', layers: {} },
    });
    expect(res.statusCode).toBe(401);
  });

  it('200 with x-api-key returns full 11-step ΩE chain', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'hugh@example.com', password: 'Secret123' },
    });
    const { apiKey } = reg.json();
    const res = await app.inject({
      method: 'POST',
      url: '/api/omega/reason',
      headers: { 'x-api-key': apiKey.token },
      payload: { query: 'q', domain: 'mock', layers: {} },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.reasoning).toHaveLength(11);
    expect(body.metadata.domain).toBe('mock');
  });

  it('401 with malformed api key (missing omega_ prefix)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/omega/reason',
      headers: { 'x-api-key': 'not-an-omega-key' },
      payload: { query: 'q', domain: 'mock', layers: {} },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().message).toContain('invalid api key format');
  });
});

describe('/api/domains — protected', () => {
  it('401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/domains' });
    expect(res.statusCode).toBe(401);
  });

  it('200 with valid JWT', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'ivan@example.com', password: 'Secret123' },
    });
    const { jwt: token } = reg.json();
    const res = await app.inject({
      method: 'GET',
      url: '/api/domains',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });
});

describe('/health — public', () => {
  it('200 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
  });
});
