import { TIER_LIMITS, type UserTier } from '@omega/shared';
import type { RateLimitDecision, RateLimiter } from './types.js';

interface Bucket {
  count: number;
  /** Epoch ms at which the bucket resets. */
  expiresAt: number;
}

interface WindowSpec {
  name: 'hour' | 'day';
  durationMs: number;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface InMemoryRateLimiterOptions {
  /** Override durations for tests (e.g. 50ms hour). */
  windowOverrides?: Partial<Record<'hour' | 'day', number>>;
  /** Override per-tier limits for tests. */
  limitOverrides?: Partial<Record<UserTier, { rph?: number | null; rpd?: number | null }>>;
}

/**
 * In-memory limiter. Used by the test suite and by dev when Redis is
 * unavailable (and the operator opts in via REDIS_URL=memory).
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly windows: WindowSpec[];
  private readonly limitOverrides: InMemoryRateLimiterOptions['limitOverrides'];

  constructor(opts: InMemoryRateLimiterOptions = {}) {
    this.windows = [
      { name: 'hour', durationMs: opts.windowOverrides?.hour ?? HOUR_MS },
      { name: 'day', durationMs: opts.windowOverrides?.day ?? DAY_MS },
    ];
    this.limitOverrides = opts.limitOverrides;
  }

  async consume(userId: string, tier: UserTier): Promise<RateLimitDecision> {
    const limits = this.limitsFor(tier);
    if (limits.rph === null && limits.rpd === null) return { allowed: true };

    const now = Date.now();

    // First, check both windows without incrementing.
    for (const w of this.windows) {
      const limit = w.name === 'hour' ? limits.rph : limits.rpd;
      if (limit === null) continue;
      const bucket = this.bucketFor(userId, w.name, now);
      if (bucket.count >= limit) {
        const retryAfter = Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000));
        return { allowed: false, retryAfter, window: w.name, limit };
      }
    }

    // All checks passed — consume from each window.
    for (const w of this.windows) {
      const limit = w.name === 'hour' ? limits.rph : limits.rpd;
      if (limit === null) continue;
      const bucket = this.bucketFor(userId, w.name, now);
      bucket.count += 1;
    }

    return { allowed: true };
  }

  private bucketFor(userId: string, name: 'hour' | 'day', now: number): Bucket {
    const key = `${userId}:${name}`;
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.expiresAt <= now) {
      const window = this.windows.find((w) => w.name === name)!;
      bucket = { count: 0, expiresAt: now + window.durationMs };
      this.buckets.set(key, bucket);
    }
    return bucket;
  }

  private limitsFor(tier: UserTier): { rph: number | null; rpd: number | null } {
    const base = TIER_LIMITS[tier];
    const override = this.limitOverrides?.[tier];
    return {
      rph: override?.rph !== undefined ? override.rph : base.rph,
      rpd: override?.rpd !== undefined ? override.rpd : base.rpd,
    };
  }
}
