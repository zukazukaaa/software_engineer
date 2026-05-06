import { z } from 'zod';

/**
 * Password complexity: at least 8 chars, ≥1 letter, ≥1 digit. The composite
 * regex keeps the rule visible at the schema layer; tightening (special
 * chars, dictionary checks, etc.) is a Phase 2 concern.
 */
export const passwordSchema = z
  .string()
  .min(8, 'password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'password must contain at least one letter')
  .regex(/\d/, 'password must contain at least one digit');

export const emailSchema = z.string().email().toLowerCase();

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export type RegisterRequest = z.infer<typeof registerSchema>;

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, 'password is required'),
  })
  .strict();

export type LoginRequest = z.infer<typeof loginSchema>;

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(1),
  })
  .strict();

export type RefreshRequest = z.infer<typeof refreshSchema>;

export const createApiKeySchema = z
  .object({
    name: z.string().min(1).max(64),
  })
  .strict();

export type CreateApiKeyRequest = z.infer<typeof createApiKeySchema>;
