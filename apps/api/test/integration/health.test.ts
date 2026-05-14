import { describe, expect, it } from 'vitest';
import { getTestApp, getTestRedis, setupIntegration } from './setup.js';

setupIntegration();

describe('Integration: /health endpoints', () => {
  it('GET /health → 200 (liveness, dep-independent)', async () => {
    const app = await getTestApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
  });

  it('GET /health/ready → 200 with db.ok + redis.ok when both up', async () => {
    const app = await getTestApp();
    const res = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.checks.db.status).toBe('ok');
    expect(body.checks.redis.status).toBe('ok');
    expect(body.checks.db.latencyMs).toBeGreaterThanOrEqual(0);
    expect(body.checks.redis.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('GET /health/ready → 503 when Redis is unreachable', async () => {
    const app = await getTestApp();
    const redis = await getTestRedis();

    // Force the client offline. ioredis rejects subsequent pings.
    redis.disconnect();

    try {
      const res = await app.inject({ method: 'GET', url: '/health/ready' });
      expect(res.statusCode).toBe(503);
      expect(res.json().status).toBe('degraded');
      expect(res.json().checks.redis.status).toBe('down');
    } finally {
      // Reconnect for subsequent tests.
      await redis.connect().catch(() => {
        /* may already be connecting */
      });
    }
  });
});
