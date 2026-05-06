export const USER_TIERS = ['FREE', 'PRO', 'ENTERPRISE'] as const;
export type UserTier = (typeof USER_TIERS)[number];

export const RATE_LIMITS: Record<UserTier, { rpm: number; rpd: number }> = {
  FREE: { rpm: 10, rpd: 100 },
  PRO: { rpm: 60, rpd: 5_000 },
  ENTERPRISE: { rpm: 600, rpd: 100_000 },
};
