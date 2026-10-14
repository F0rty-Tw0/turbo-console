import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'core-contract',
    root: import.meta.dirname,
    watch: false,
    // Contract specs generate fixture repos and spawn the real turbo binary; Windows runners are slow at both.
    testTimeout: 120_000,
    // A beforeAll may generate and copy the 300-package stretch fixture on a cold cache; on windows-latest that took
    // over 120 s.
    hookTimeout: 300_000,
    // Generates the big fixtures once, before the workers start, so their beforeAll hooks only copy them.
    globalSetup: ['src/shared/turbo/test/utils/warm-fixtures.spec.util.ts'],
    maxWorkers: 2,
    include: ['src/**/*.contract.spec.ts'],
    exclude: ['**/fixtures/**', '**/tmp/**', '**/node_modules/**']
  }
});
