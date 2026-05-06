export const USER_TIERS = ['FREE', 'PRO', 'ENTERPRISE'] as const;
export type UserTier = (typeof USER_TIERS)[number];

/**
 * Per-tier limits.
 * - rph: requests per rolling 1-hour window
 * - rpd: requests per rolling 1-day window
 * - apiKeys: maximum number of active API keys per account
 *
 * ENTERPRISE bypasses rate limits entirely (`null`).
 */
export interface TierConfig {
  rph: number | null;
  rpd: number | null;
  apiKeys: number;
}

export const TIER_LIMITS: Record<UserTier, TierConfig> = {
  FREE: { rph: 100, rpd: 1_000, apiKeys: 1 },
  PRO: { rph: 1_000, rpd: 20_000, apiKeys: 5 },
  ENTERPRISE: { rph: null, rpd: null, apiKeys: 100 },
};

export const isUserTier = (value: unknown): value is UserTier =>
  typeof value === 'string' && (USER_TIERS as readonly string[]).includes(value);
