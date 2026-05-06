import type { FastifyInstance, FastifyReply } from 'fastify';
import { redisPing } from '../redis/client.js';
import { getPrisma } from '@omega/db';

interface DepStatus {
  status: 'ok' | 'down';
  latencyMs: number;
  error?: string;
}

const checkDb = async (): Promise<DepStatus> => {
  const t0 = performance.now();
  try {
    // Cheap round-trip query. Validates both connection and that the
    // database accepts queries.
    await getPrisma().$queryRaw`SELECT 1`;
    return { status: 'ok', latencyMs: Math.round(performance.now() - t0) };
  } catch (err) {
    return {
      status: 'down',
      latencyMs: Math.round(performance.now() - t0),
      error: err instanceof Error ? err.message : String(err),
    };
  }
};

const checkRedis = async (): Promise<DepStatus> => {
  try {
    const result = await redisPing();
    return {
      status: result.ok ? 'ok' : 'down',
      latencyMs: result.latencyMs,
      ...(result.error ? { error: result.error } : {}),
    };
  } catch (err) {
    // initRedis() not called yet — treat as down.
    return {
      status: 'down',
      latencyMs: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
};

/**
 * Public health endpoints. Both bypass auth.
 *
 *   GET /health        — liveness; always 200 if the process is alive.
 *   GET /health/ready  — readiness; checks DB + Redis. 200 when both
 *                        ok, 503 with details otherwise.
 *
 * Used by container orchestrators (k8s probes, ECS, etc.):
 *   livenessProbe   → /health
 *   readinessProbe  → /health/ready
 */
export const healthRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get('/health', async () => ({
    status: 'ok',
    omega: 'ΩE',
    timestamp: new Date().toISOString(),
  }));

  app.get('/health/ready', async (_request, reply: FastifyReply) => {
    const [db, redis] = await Promise.all([checkDb(), checkRedis()]);
    const allOk = db.status === 'ok' && redis.status === 'ok';
    const body = {
      status: allOk ? 'ok' : 'degraded',
      checks: { db, redis },
      timestamp: new Date().toISOString(),
    };
    return reply.code(allOk ? 200 : 503).send(body);
  });
};
