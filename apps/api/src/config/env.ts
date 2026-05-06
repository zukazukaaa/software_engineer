import { z } from 'zod';

/**
 * Strict environment schema.
 *
 * Validated once at process boot. On failure, every issue is logged and
 * the process exits 1 — no app code should ever read process.env
 * directly past this module. Re-export the parsed `env` and import it
 * everywhere instead.
 *
 * The .env auto-load (apps/api/src/bootstrap-env.ts) is loaded before
 * this module is imported, so dev gets values from the project-root
 * .env, prod from the host-injected environment.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(4000),

  // Database / Redis. Required at runtime; optional in unit tests that
  // inject in-memory stores. We keep them required at schema level and
  // let unit tests override via process.env before bootstrap.
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // Rate limiter behaviour when Redis is unreachable.
  //   open   → allow request (dev convenience)
  //   closed → block with 503 (prod default)
  REDIS_FAIL_MODE: z.enum(['open', 'closed']).default('closed'),

  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-opus-4-7'),
  LOG_LEVEL: z.string().default('info'),
});

export type Env = z.infer<typeof schema>;

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Use console.error here — the logger module imports this module, so
  // we can't depend on the structured logger.
  // eslint-disable-next-line no-console
  console.error('✗ Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env: Env = parsed.data;
