import fp from 'fastify-plugin';
import type { FastifyPluginAsync, preHandlerAsyncHookHandler } from 'fastify';
import type { RateLimiter } from '../rate-limit/types.js';

declare module 'fastify' {
  interface FastifyInstance {
    rateLimiter: RateLimiter;
    requireRateLimit: preHandlerAsyncHookHandler;
  }
}

export interface RateLimitPluginOptions {
  rateLimiter: RateLimiter;
}

/**
 * The rate-limit plugin assumes auth has already populated `request.user`.
 * Apply `app.requireAuth` BEFORE `app.requireRateLimit` in route preHandler
 * arrays, or the limiter will throw "unauthenticated" by design — we never
 * want to gate anonymous requests on per-user counters.
 */
const rateLimitPlugin: FastifyPluginAsync<RateLimitPluginOptions> = async (app, opts) => {
  app.decorate('rateLimiter', opts.rateLimiter);

  const requireRateLimit: preHandlerAsyncHookHandler = async (request, reply) => {
    const user = request.user;
    if (!user) {
      throw new Error('requireRateLimit ran before requireAuth');
    }
    const decision = await opts.rateLimiter.consume(user.id, user.tier);
    if (!decision.allowed) {
      reply.header('Retry-After', String(decision.retryAfter ?? 60));
      return reply.code(429).send({
        error: 'rate_limited',
        message: `${decision.window ?? 'window'} limit reached`,
        retryAfter: decision.retryAfter ?? 60,
        window: decision.window,
        limit: decision.limit,
      });
    }
  };

  app.decorate('requireRateLimit', requireRateLimit);
};

export default fp(rateLimitPlugin, { name: 'omega-rate-limit', dependencies: ['omega-auth'] });
