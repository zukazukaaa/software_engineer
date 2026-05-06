import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InMemoryAuthStore } from '../auth/in-memory-store.js';
import { hashPassword } from '../auth/passwords.js';
import { type TokenConfig } from '../auth/tokens.js';
import { InMemoryRateLimiter } from '../rate-limit/in-memory.js';
import { buildServer } from '../server.js';

const TEST_TOKEN_CONFIG: TokenConfig = {
  accessSecret: 'test-access-secret',
  refreshSecret: 'test-refresh-secret',
  accessExpiresIn: '15m',
  refreshExpiresIn: '7d',
};

const buildAuthedApp = async (
  tier: 'FREE' | 'PRO' | 'ENTERPRISE',
  limiter: InMemoryRateLimiter,
) => {
  const authStore = new InMemoryAuthStore();
  const app = await buildServer({
    authStore,
    rateLimiter: limiter,
    tokenConfig: TEST_TOKEN_CONFIG,
  });
  const user = await authStore.createUser({
    email: `${tier.toLowerCase()}-user@example.com`,
    passwordHash: await hashPassword('Secret123'),
  });
  // Promote the user's tier directly via the store helper (no public route).
  (authStore as unknown as { users: Map<string, typeof user> }).users.set(user.id, {
    ...user,
    tier,
  });
  // Issue an API key.
  const { generateApiKey } = await import('../auth/api-keys.js');
  const { token, hashedKey, prefix } = generateApiKey();
  await authStore.createApiKey({ userId: user.id, hashedKey, prefix, name: 'test' });
  return { app, token };
};

let activeApp: Awaited<ReturnType<typeof buildServer>> | null = null;

afterEach(async () => {
  if (activeApp) await activeApp.close();
  activeApp = null;
});

describe('rate limiting', () => {
  it('429 with Retry-After when hour limit hit (FREE tier, 2-req cap)', async () => {
    const limiter = new InMemoryRateLimiter({
      limitOverrides: { FREE: { rph: 2, rpd: 1000 } },
    });
    const { app, token } = await buildAuthedApp('FREE', limiter);
    activeApp = app;

    for (let i = 0; i < 2; i++) {
      const ok = await app.inject({
        method: 'POST',
        url: '/api/omega/reason',
        headers: { 'x-api-key': token },
        payload: { query: 'q', domain: 'mock', layers: {} },
      });
      expect(ok.statusCode).toBe(200);
    }
    const limited = await app.inject({
      method: 'POST',
      url: '/api/omega/reason',
      headers: { 'x-api-key': token },
      payload: { query: 'q', domain: 'mock', layers: {} },
    });
    expect(limited.statusCode).toBe(429);
    expect(limited.headers['retry-after']).toBeDefined();
    const body = limited.json();
    expect(body.error).toBe('rate_limited');
    expect(body.window).toBe('hour');
    expect(body.limit).toBe(2);
    expect(body.retryAfter).toBeGreaterThan(0);
  });

  it('ENTERPRISE bypasses rate limit even with rph=1 override', async () => {
    const limiter = new InMemoryRateLimiter({
      // Override matters only for non-ENTERPRISE; ENTERPRISE has null limits
      // in TIER_LIMITS and the limiter short-circuits before it ever checks.
      limitOverrides: { FREE: { rph: 1 } },
    });
    const { app, token } = await buildAuthedApp('ENTERPRISE', limiter);
    activeApp = app;

    for (let i = 0; i < 5; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/omega/reason',
        headers: { 'x-api-key': token },
        payload: { query: 'q', domain: 'mock', layers: {} },
      });
      expect(res.statusCode).toBe(200);
    }
  });
});
