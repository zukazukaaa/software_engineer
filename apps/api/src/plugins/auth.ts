import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import type { UserTier } from '@omega/shared';
import type { AuthStore, UserRecord } from '../auth/types.js';
import { isApiKeyToken, hashApiKey } from '../auth/api-keys.js';
import { safeVerifyAccess, type TokenConfig } from '../auth/tokens.js';

/**
 * `request.user` carries the authenticated principal once `requireAuth`
 * has run. The minimal shape is enough for routes — full records sit
 * behind authStore.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  tier: UserTier;
  /** How auth happened, useful for log analysis. */
  via: 'jwt' | 'api-key';
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthenticatedUser | null;
  }
  interface FastifyInstance {
    requireAuth: preHandlerAsyncHookHandler;
    authStore: AuthStore;
    tokenConfig: TokenConfig;
  }
}

export interface AuthPluginOptions {
  authStore: AuthStore;
  tokenConfig: TokenConfig;
}

const send401 = (reply: FastifyReply, message: string) =>
  reply.code(401).send({ error: 'unauthorized', message });

const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (app, opts) => {
  app.decorate('authStore', opts.authStore);
  app.decorate('tokenConfig', opts.tokenConfig);
  app.decorateRequest('user', null);

  const requireAuth: preHandlerAsyncHookHandler = async (request, reply) => {
    const apiKeyHeader = request.headers['x-api-key'];
    const authHeader = request.headers.authorization;

    let user: UserRecord | null = null;
    let via: 'jwt' | 'api-key' | null = null;

    if (typeof apiKeyHeader === 'string' && apiKeyHeader.length > 0) {
      if (!isApiKeyToken(apiKeyHeader)) {
        return send401(reply, 'invalid api key format');
      }
      const hashed = hashApiKey(apiKeyHeader);
      const match = await opts.authStore.findApiKeyByHash(hashed);
      if (!match) return send401(reply, 'invalid api key');
      user = match.user;
      via = 'api-key';
      // touch is best-effort — never block the request on it
      void opts.authStore.touchApiKey(match.apiKey.id).catch(() => undefined);
    } else if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      const result = safeVerifyAccess(opts.tokenConfig, token);
      if ('error' in result) {
        return send401(reply, result.error.message);
      }
      const found = await opts.authStore.findUserById(result.sub);
      if (!found) return send401(reply, 'user no longer exists');
      user = found;
      via = 'jwt';
    } else {
      return send401(reply, 'missing credentials (Bearer token or x-api-key)');
    }

    request.user = {
      id: user.id,
      email: user.email,
      tier: user.tier,
      via: via!,
    };
  };

  app.decorate('requireAuth', requireAuth);
};

export default fp(authPlugin, { name: 'omega-auth' });

/** Helper for routes that want a typed reference to the authenticated user. */
export const getUser = (request: FastifyRequest): AuthenticatedUser => {
  if (!request.user) {
    throw new Error('getUser called on an unauthenticated request');
  }
  return request.user;
};
