import type { Redis } from 'ioredis';
import { TIER_LIMITS, type UserTier } from '@omega/shared';
import type { RateLimitDecision, RateLimiter } from './types.js';

const HOUR_S = 60 * 60;
const DAY_S = 24 * HOUR_S;

export interface RedisRateLimiterOptions {
  /** Fail-open in development when Redis is unreachable; fail-closed in prod. */
  failOpen: boolean;
  logger?: { warn: (obj: unknown, msg?: string) => void; error: (obj: unknown, msg?: string) => void };
}

/**
 * Redis-backed limiter.
 *
 * Key format (matches the Phase 1 brief):
 *   ratelimit:{userId}:hour
 *   ratelimit:{userId}:day
 *
 * Strategy: INCR + EXPIRE on first increment in the window. Pipelined for
 * a single round-trip per request. Two windows (hour, day) are checked in
 * a single pipeline.
 */
export class RedisRateLimiter implements RateLimiter {
  constructor(
    private readonly redis: Redis,
    private readonly opts: RedisRateLimiterOptions,
  ) {}

  async consume(userId: string, tier: UserTier): Promise<RateLimitDecision> {
    const limits = TIER_LIMITS[tier];
    if (limits.rph === null && limits.rpd === null) return { allowed: true };

    const hourKey = `ratelimit:${userId}:hour`;
    const dayKey = `ratelimit:${userId}:day`;

    try {
      const pipeline = this.redis.multi();
      pipeline.incr(hourKey);
      pipeline.expire(hourKey, HOUR_S, 'NX');
      pipeline.ttl(hourKey);
      pipeline.incr(dayKey);
      pipeline.expire(dayKey, DAY_S, 'NX');
      pipeline.ttl(dayKey);
      const results = await pipeline.exec();
      if (!results) throw new Error('redis pipeline returned null');

      const hourCount = results[0]?.[1] as number;
      const hourTtl = results[2]?.[1] as number;
      const dayCount = results[3]?.[1] as number;
      const dayTtl = results[5]?.[1] as number;

      // Check day first (longer rejection wins precedence in retryAfter).
      if (limits.rpd !== null && dayCount > limits.rpd) {
        await this.refundExceeded(hourKey, dayKey);
        return {
          allowed: false,
          retryAfter: Math.max(1, dayTtl),
          window: 'day',
          limit: limits.rpd,
          reason: 'limit',
        };
      }
      if (limits.rph !== null && hourCount > limits.rph) {
        await this.refundExceeded(hourKey, dayKey);
        return {
          allowed: false,
          retryAfter: Math.max(1, hourTtl),
          window: 'hour',
          limit: limits.rph,
          reason: 'limit',
        };
      }
      return { allowed: true };
    } catch (err) {
      if (this.opts.failOpen) {
        this.opts.logger?.warn?.({ err }, 'rate-limit redis unavailable; failing open');
        return { allowed: true };
      }
      this.opts.logger?.error?.({ err }, 'rate-limit redis unavailable; failing closed');
      return {
        allowed: false,
        retryAfter: 5,
        reason: 'unavailable',
      };
    }
  }

  /**
   * On rejection we still incremented the counters. Decrement to avoid
   * over-counting failed requests against the user's quota.
   */
  private async refundExceeded(hourKey: string, dayKey: string): Promise<void> {
    try {
      await this.redis.multi().decr(hourKey).decr(dayKey).exec();
    } catch {
      /* swallow — refund is best-effort */
    }
  }
}
