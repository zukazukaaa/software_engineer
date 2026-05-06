import { describe, expect, it } from 'vitest';
import { getTestApp, getTestRedis, setupIntegration } from './setup.js';

setupIntegration();

describe('Integration: rate limit against real Redis', () => {
  it('counter increments in Redis and trips at FREE tier', async () => {
    const app = await getTestApp();
    const redis = await getTestRedis();

    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'rl@example.com', password: 'Secret123' },
    });
    const apiKey = reg.json().apiKey.token as string;
    const userId = reg.json().user.id as string;

    // Three quick requests should succeed under FREE (default 100/h).
    for (let i = 0; i < 3; i++) {
      const r = await app.inject({
        method: 'POST',
        url: '/api/omega/reason',
        headers: { 'x-api-key': apiKey },
        payload: { query: 'q', domain: 'mock', layers: {} },
      });
      expect(r.statusCode).toBe(200);
    }

    // The hour counter for this user in Redis should equal 3.
    const counter = await redis.get(`ratelimit:${userId}:hour`);
    expect(counter).toBe('3');

    // Pre-load Redis to one short of the limit, then verify the next
    // call returns 429 with Retry-After.
    await redis.set(`ratelimit:${userId}:hour`, '100', 'EX', 3600);
    const limited = await app.inject({
      method: 'POST',
      url: '/api/omega/reason',
      headers: { 'x-api-key': apiKey },
      payload: { query: 'q', domain: 'mock', layers: {} },
    });
    expect(limited.statusCode).toBe(429);
    expect(limited.headers['retry-after']).toBeDefined();
    expect(limited.json().window).toBe('hour');
    expect(limited.json().limit).toBe(100);
  });
});
