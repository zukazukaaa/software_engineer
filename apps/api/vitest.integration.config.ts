import { defineConfig } from 'vitest/config';

/**
 * Integration test config. Driven by scripts/test-integration.sh, which
 * spins up docker-compose.test.yml, applies migrations, then runs:
 *   vitest run --config vitest.integration.config.ts
 *
 * Distinct config so this never runs during the normal `test:unit` pass
 * — integration tests need real services and would fail otherwise.
 */
export default defineConfig({
  test: {
    include: ['test/integration/**/*.test.ts'],
    // Each file boots its own server; serialize to keep a single
    // truncate-between-tests semantics across the suite.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
