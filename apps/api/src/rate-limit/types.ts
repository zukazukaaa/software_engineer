import type { UserTier } from '@omega/shared';

export interface RateLimitDecision {
  /** Whether the request may proceed. */
  allowed: boolean;
  /**
   * Seconds until the violated window resets. Only set when `allowed` is
   * false. Used as the value for the `Retry-After` response header.
   */
  retryAfter?: number;
  /** Identifier of the window that triggered the limit, for logs. */
  window?: 'hour' | 'day';
  /** Limit value of the violated window, for logs. */
  limit?: number;
}

export interface RateLimiter {
  /**
   * Atomically increment per-user counters and return whether the request
   * is allowed. ENTERPRISE bypasses checks entirely.
   *
   * Behavior contract:
   *   - if no limits apply (ENTERPRISE), `allowed: true` and no counter
   *     mutation happens
   *   - the limiter must NOT increment a counter that would put the user
   *     over its limit (consume-on-success), so checks of subsequent
   *     windows behave correctly
   *   - on storage failure the limiter MAY return `allowed: true` (fail
   *     open) — concrete implementations document their policy
   */
  consume(userId: string, tier: UserTier): Promise<RateLimitDecision>;
}
