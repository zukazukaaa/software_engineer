/**
 * Vitest setup file. Runs before each test file is imported, which means
 * before apps/api/src/config/env.ts validates process.env. We inject
 * harmless stubs for the required vars; integration tests override with
 * real values via docker-compose.test.yml + scripts/test-integration.sh.
 */

const setIfMissing = (key: string, value: string): void => {
  if (!process.env[key]) process.env[key] = value;
};

setIfMissing('NODE_ENV', 'test');
setIfMissing('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
setIfMissing('REDIS_URL', 'redis://localhost:6380');
setIfMissing('JWT_SECRET', 'unit-test-jwt-secret');
setIfMissing('JWT_REFRESH_SECRET', 'unit-test-refresh-secret');
// Unit tests don't talk to a real Redis; default to fail-open so we
// don't accidentally 503 in the Noop limiter path.
setIfMissing('REDIS_FAIL_MODE', 'open');
