import { Redis, type RedisOptions } from 'ioredis';

/**
 * Shared ioredis client. Lazy-connect so unit tests that don't touch
 * Redis don't trigger a TCP attempt at import time.
 *
 * Hot-reload safe: instance stashed on globalThis.
 */

declare global {
  // eslint-disable-next-line no-var
  var __omegaRedis: Redis | undefined;
}

export interface RedisClientOptions {
  url: string;
  /** Forwarded to ioredis. Defaults are dev-friendly. */
  ioredis?: RedisOptions;
}

const defaultOptions: RedisOptions = {
  lazyConnect: true,
  // Fail fast: don't sit on a long timeout when Redis is missing.
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  connectTimeout: 1000,
};

export const initRedis = (opts: RedisClientOptions): Redis => {
  if (globalThis.__omegaRedis) return globalThis.__omegaRedis;
  const client = new Redis(opts.url, { ...defaultOptions, ...(opts.ioredis ?? {}) });
  client.on('error', () => {
    // Errors are surfaced by the rate-limit / health code paths that
    // call into this client; don't crash the process here.
  });
  globalThis.__omegaRedis = client;
  return client;
};

export const getRedis = (): Redis => {
  if (!globalThis.__omegaRedis) {
    throw new Error('Redis client not initialised — call initRedis() at boot');
  }
  return globalThis.__omegaRedis;
};

export const closeRedis = async (): Promise<void> => {
  if (!globalThis.__omegaRedis) return;
  try {
    await globalThis.__omegaRedis.quit();
  } catch {
    globalThis.__omegaRedis.disconnect();
  }
  globalThis.__omegaRedis = undefined;
};

// ──────────────────────────────────────────────────────────────────────
// Typed helpers — small wrappers that surface ioredis return shapes as
// the types we actually use in app code.
// ──────────────────────────────────────────────────────────────────────

export const redisGet = (key: string): Promise<string | null> => getRedis().get(key);

export const redisSet = (
  key: string,
  value: string,
  opts: { ex?: number } = {},
): Promise<'OK' | null> => {
  if (opts.ex) return getRedis().set(key, value, 'EX', opts.ex);
  return getRedis().set(key, value);
};

export const redisIncr = (key: string): Promise<number> => getRedis().incr(key);

export const redisExpire = (key: string, seconds: number): Promise<number> =>
  getRedis().expire(key, seconds);

/**
 * Round-trip ping with timing. Used by /health/ready.
 */
export const redisPing = async (): Promise<{ ok: boolean; latencyMs: number; error?: string }> => {
  const t0 = performance.now();
  try {
    const reply = await getRedis().ping();
    const latencyMs = Math.round(performance.now() - t0);
    return { ok: reply === 'PONG', latencyMs };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - t0),
      error: err instanceof Error ? err.message : String(err),
    };
  }
};
