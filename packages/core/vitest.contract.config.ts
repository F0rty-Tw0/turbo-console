import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'core-contract',
    root: import.meta.dirname,
    watch: false,
    // Contract specs generate fixture repos and spawn the real turbo binary; Windows runners are slow at both.
    testTimeout: 120_000,
    hookTimeout: 120_000,
    maxWorkers: 2,
    include: ['src/**/*.contract.spec.ts'],
    exclude: ['**/fixtures/**', '**/tmp/**', '**/node_modules/**']
  }
});
