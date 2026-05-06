import { type PrismaClient, Prisma } from '@omega/db';
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
 * Production AuthStore backed by Prisma. The schema lives in
 * packages/omega-db/prisma/schema.prisma (UserAuth + ApiKey models).
 */
export class PrismaAuthStore implements AuthStore {
  constructor(private readonly prisma: PrismaClient) {}

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const u = await this.prisma.userAuth.findUnique({ where: { email } });
    return u ? this.mapUser(u) : null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const u = await this.prisma.userAuth.findUnique({ where: { id } });
    return u ? this.mapUser(u) : null;
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    try {
      const u = await this.prisma.userAuth.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          tier: isUserTier(input.tier) ? input.tier : 'FREE',
        },
      });
      return this.mapUser(u);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new DuplicateEmailError(input.email);
      }
      throw err;
    }
  }

  async setRefreshTokenHash(userId: string, hash: string | null): Promise<void> {
    await this.prisma.userAuth.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
    });
  }

  async createApiKey(input: CreateApiKeyInput): Promise<ApiKeyRecord> {
    const k = await this.prisma.apiKey.create({ data: input });
    return this.mapApiKey(k);
  }

  async findApiKeyByHash(
    hashedKey: string,
  ): Promise<{ apiKey: ApiKeyRecord; user: UserRecord } | null> {
    const k = await this.prisma.apiKey.findUnique({
      where: { hashedKey },
      include: { user: true },
    });
    if (!k) return null;
    return { apiKey: this.mapApiKey(k), user: this.mapUser(k.user) };
  }

  async listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
    const rows = await this.prisma.apiKey.findMany({ where: { userId } });
    return rows.map((r) => this.mapApiKey(r));
  }

  async countApiKeys(userId: string): Promise<number> {
    return this.prisma.apiKey.count({ where: { userId } });
  }

  async deleteApiKey(userId: string, id: string): Promise<boolean> {
    const result = await this.prisma.apiKey.deleteMany({ where: { id, userId } });
    return result.count > 0;
  }

  async touchApiKey(id: string): Promise<void> {
    await this.prisma.apiKey.update({ where: { id }, data: { lastUsedAt: new Date() } });
  }

  private mapUser(u: {
    id: string;
    email: string;
    passwordHash: string;
    tier: string;
    refreshTokenHash: string | null;
    createdAt: Date;
  }): UserRecord {
    const tier: UserTier = isUserTier(u.tier) ? u.tier : 'FREE';
    return {
      id: u.id,
      email: u.email,
      passwordHash: u.passwordHash,
      tier,
      refreshTokenHash: u.refreshTokenHash,
      createdAt: u.createdAt,
    };
  }

  private mapApiKey(k: {
    id: string;
    userId: string;
    hashedKey: string;
    prefix: string;
    name: string;
    lastUsedAt: Date | null;
    createdAt: Date;
  }): ApiKeyRecord {
    return {
      id: k.id,
      userId: k.userId,
      hashedKey: k.hashedKey,
      prefix: k.prefix,
      name: k.name,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    };
  }
}
