import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'repo-gen',
    root: import.meta.dirname,
    watch: false,
    // Specs write whole fixture repos and run git; Windows runners take well over Vitest's 5s/10s defaults.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    include: ['src/**/*.spec.ts'],
    exclude: ['**/fixtures/**', '**/tmp/**', '**/node_modules/**']
  }
});
