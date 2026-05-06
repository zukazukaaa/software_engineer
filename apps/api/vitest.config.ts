import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run the env-stub setup before each test file's imports.
    setupFiles: ['./src/__tests__/_setup.ts'],
    // Default exclude — integration tests live under test/integration/
    // and run via scripts/test-integration.sh, never via the unit pass.
    exclude: ['**/node_modules/**', '**/dist/**', '**/test/integration/**'],
  },
});
