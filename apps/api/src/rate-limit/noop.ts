import type { RateLimitDecision, RateLimiter } from './types.js';

/** Always-allow limiter. Used in dev when no Redis is configured. */
export class NoopRateLimiter implements RateLimiter {
  async consume(): Promise<RateLimitDecision> {
    return { allowed: true };
  }
}
