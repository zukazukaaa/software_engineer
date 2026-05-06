import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  TIER_LIMITS,
  createApiKeySchema,
  loginSchema,
  refreshSchema,
  registerSchema,
} from '@omega/shared';
import { generateApiKey, hashApiKey } from '../auth/api-keys.js';
import { hashPassword, verifyPassword } from '../auth/passwords.js';
import {
  hashRefreshToken,
  safeVerifyRefresh,
  signAccessToken,
  signRefreshToken,
} from '../auth/tokens.js';
import { DuplicateEmailError, type UserRecord } from '../auth/types.js';
import { getUser } from '../plugins/auth.js';

const publicUser = (u: UserRecord) => ({
  id: u.id,
  email: u.email,
  tier: u.tier,
  createdAt: u.createdAt.toISOString(),
});

const sendValidationError = (reply: FastifyReply, issues: unknown) =>
  reply.code(400).send({ error: 'invalid_request', issues });

export const authRoutes = async (app: FastifyInstance): Promise<void> => {
  // POST /register — email + password → { user, jwt, refreshToken, apiKey }
  app.post('/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) return sendValidationError(reply, parsed.error.issues);

    const passwordHash = await hashPassword(parsed.data.password);

    let user: UserRecord;
    try {
      user = await app.authStore.createUser({
        email: parsed.data.email,
        passwordHash,
      });
    } catch (err) {
      if (err instanceof DuplicateEmailError) {
        return reply.code(409).send({ error: 'email_taken', message: err.message });
      }
      throw err;
    }

    const access = signAccessToken(app.tokenConfig, {
      sub: user.id,
      email: user.email,
      tier: user.tier,
    });
    const refresh = signRefreshToken(app.tokenConfig, { sub: user.id, jti: randomUUID() });
    await app.authStore.setRefreshTokenHash(user.id, hashRefreshToken(refresh));

    const { token, hashedKey, prefix } = generateApiKey();
    const apiKeyRecord = await app.authStore.createApiKey({
      userId: user.id,
      hashedKey,
      prefix,
      name: 'default',
    });

    return reply.code(201).send({
      user: publicUser(user),
      jwt: access,
      refreshToken: refresh,
      apiKey: {
        id: apiKeyRecord.id,
        prefix,
        name: apiKeyRecord.name,
        token, // returned exactly once
      },
    });
  });

  // POST /login
  app.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) return sendValidationError(reply, parsed.error.issues);

    const user = await app.authStore.findUserByEmail(parsed.data.email);
    // Constant-ish-time response: if user is null, run a dummy verify to
    // avoid an obvious timing oracle.
    const ok = user
      ? await verifyPassword(parsed.data.password, user.passwordHash)
      : await verifyPassword(parsed.data.password, '$2a$12$invalidhashinvalidhashinvalidhashinvalidhashinvalidhash');
    if (!user || !ok) {
      return reply.code(401).send({ error: 'invalid_credentials' });
    }

    const access = signAccessToken(app.tokenConfig, {
      sub: user.id,
      email: user.email,
      tier: user.tier,
    });
    const refresh = signRefreshToken(app.tokenConfig, { sub: user.id, jti: randomUUID() });
    await app.authStore.setRefreshTokenHash(user.id, hashRefreshToken(refresh));

    return reply.send({
      user: publicUser(user),
      jwt: access,
      refreshToken: refresh,
    });
  });

  // POST /refresh
  app.post('/refresh', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) return sendValidationError(reply, parsed.error.issues);

    const result = safeVerifyRefresh(app.tokenConfig, parsed.data.refreshToken);
    if ('error' in result) {
      return reply.code(401).send({ error: 'invalid_refresh_token', message: result.error.message });
    }

    const user = await app.authStore.findUserById(result.sub);
    if (!user || !user.refreshTokenHash) {
      return reply.code(401).send({ error: 'invalid_refresh_token' });
    }

    const submittedHash = hashRefreshToken(parsed.data.refreshToken);
    if (submittedHash !== user.refreshTokenHash) {
      return reply.code(401).send({ error: 'invalid_refresh_token', message: 'token revoked' });
    }

    const access = signAccessToken(app.tokenConfig, {
      sub: user.id,
      email: user.email,
      tier: user.tier,
    });
    return reply.send({ jwt: access });
  });

  // GET /me — protected
  app.get('/me', { preHandler: app.requireAuth }, async (request) => {
    const u = getUser(request);
    return { id: u.id, email: u.email, tier: u.tier, via: u.via };
  });

  // POST /api-keys — protected, respects tier
  app.post('/api-keys', { preHandler: app.requireAuth }, async (request, reply) => {
    const parsed = createApiKeySchema.safeParse(request.body);
    if (!parsed.success) return sendValidationError(reply, parsed.error.issues);

    const u = getUser(request);
    const limit = TIER_LIMITS[u.tier].apiKeys;
    const count = await app.authStore.countApiKeys(u.id);
    if (count >= limit) {
      return reply.code(403).send({
        error: 'tier_limit_reached',
        message: `tier ${u.tier} allows ${limit} api key(s); already at limit`,
      });
    }

    const { token, hashedKey, prefix } = generateApiKey();
    const record = await app.authStore.createApiKey({
      userId: u.id,
      hashedKey,
      prefix,
      name: parsed.data.name,
    });

    return reply.code(201).send({
      id: record.id,
      prefix,
      name: record.name,
      token, // returned exactly once
      createdAt: record.createdAt.toISOString(),
    });
  });

  // DELETE /api-keys/:id — protected
  app.delete<{ Params: { id: string } }>(
    '/api-keys/:id',
    { preHandler: app.requireAuth },
    async (request, reply) => {
      const u = getUser(request);
      const ok = await app.authStore.deleteApiKey(u.id, request.params.id);
      if (!ok) return reply.code(404).send({ error: 'not_found' });
      return reply.code(204).send();
    },
  );

  // GET /api-keys — protected, masks token
  app.get('/api-keys', { preHandler: app.requireAuth }, async (request) => {
    const u = getUser(request);
    const keys = await app.authStore.listApiKeys(u.id);
    return keys.map((k) => ({
      id: k.id,
      prefix: k.prefix,
      name: k.name,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    }));
  });
};
