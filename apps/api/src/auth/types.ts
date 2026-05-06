import type { UserTier } from '@omega/shared';

/**
 * Storage contract for auth state. Two implementations live in this folder:
 *   - prisma-store.ts (production)
 *   - in-memory-store.ts (tests, local dev without a DB)
 *
 * Routes never talk to Prisma directly — they go through this interface so
 * the test suite can run without a database.
 */

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  tier: UserTier;
  refreshTokenHash: string | null;
  createdAt: Date;
}

export interface ApiKeyRecord {
  id: string;
  userId: string;
  hashedKey: string;
  prefix: string;
  name: string;
  lastUsedAt: Date | null;
  createdAt: Date;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  tier?: UserTier;
}

export interface CreateApiKeyInput {
  userId: string;
  hashedKey: string;
  prefix: string;
  name: string;
}

export interface AuthStore {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  createUser(input: CreateUserInput): Promise<UserRecord>;
  setRefreshTokenHash(userId: string, hash: string | null): Promise<void>;

  createApiKey(input: CreateApiKeyInput): Promise<ApiKeyRecord>;
  findApiKeyByHash(hashedKey: string): Promise<{ apiKey: ApiKeyRecord; user: UserRecord } | null>;
  listApiKeys(userId: string): Promise<ApiKeyRecord[]>;
  countApiKeys(userId: string): Promise<number>;
  deleteApiKey(userId: string, id: string): Promise<boolean>;
  touchApiKey(id: string): Promise<void>;
}

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`email '${email}' is already registered`);
    this.name = 'DuplicateEmailError';
  }
}
