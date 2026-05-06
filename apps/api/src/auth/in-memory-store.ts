import { randomUUID } from 'node:crypto';
import { isUserTier, type UserTier } from '@omega/shared';
import type {
  ApiKeyRecord,
  AuthStore,
  CreateApiKeyInput,
  CreateUserInput,
  UserRecord,
} from './types.js';
import { DuplicateEmailError } from './types.js';

/**
 * In-memory implementation. Used by the test suite and as a dev-mode
 * fallback when no DATABASE_URL is configured.
 */
export class InMemoryAuthStore implements AuthStore {
  private readonly users = new Map<string, UserRecord>();
  private readonly emailIndex = new Map<string, string>(); // email → userId
  private readonly apiKeys = new Map<string, ApiKeyRecord>();
  private readonly hashIndex = new Map<string, string>(); // hashedKey → apiKeyId

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const id = this.emailIndex.get(email);
    if (!id) return null;
    return this.users.get(id) ?? null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    if (this.emailIndex.has(input.email)) {
      throw new DuplicateEmailError(input.email);
    }
    const tier: UserTier = isUserTier(input.tier) ? input.tier : 'FREE';
    const user: UserRecord = {
      id: randomUUID(),
      email: input.email,
      passwordHash: input.passwordHash,
      tier,
      refreshTokenHash: null,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    this.emailIndex.set(user.email, user.id);
    return user;
  }

  async setRefreshTokenHash(userId: string, hash: string | null): Promise<void> {
    const u = this.users.get(userId);
    if (!u) return;
    this.users.set(userId, { ...u, refreshTokenHash: hash });
  }

  async createApiKey(input: CreateApiKeyInput): Promise<ApiKeyRecord> {
    const record: ApiKeyRecord = {
      id: randomUUID(),
      userId: input.userId,
      hashedKey: input.hashedKey,
      prefix: input.prefix,
      name: input.name,
      lastUsedAt: null,
      createdAt: new Date(),
    };
    this.apiKeys.set(record.id, record);
    this.hashIndex.set(record.hashedKey, record.id);
    return record;
  }

  async findApiKeyByHash(
    hashedKey: string,
  ): Promise<{ apiKey: ApiKeyRecord; user: UserRecord } | null> {
    const id = this.hashIndex.get(hashedKey);
    if (!id) return null;
    const apiKey = this.apiKeys.get(id);
    if (!apiKey) return null;
    const user = this.users.get(apiKey.userId);
    if (!user) return null;
    return { apiKey, user };
  }

  async listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
    return Array.from(this.apiKeys.values()).filter((k) => k.userId === userId);
  }

  async countApiKeys(userId: string): Promise<number> {
    return (await this.listApiKeys(userId)).length;
  }

  async deleteApiKey(userId: string, id: string): Promise<boolean> {
    const k = this.apiKeys.get(id);
    if (!k || k.userId !== userId) return false;
    this.apiKeys.delete(id);
    this.hashIndex.delete(k.hashedKey);
    return true;
  }

  async touchApiKey(id: string): Promise<void> {
    const k = this.apiKeys.get(id);
    if (!k) return;
    this.apiKeys.set(id, { ...k, lastUsedAt: new Date() });
  }
}
