import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'webview-ui',
    root: import.meta.dirname,
    watch: false,
    include: ['src/**/*.spec.ts', 'e2e/bench/**/*.spec.ts'],
    exclude: ['**/fixtures/**', '**/tmp/**', '**/node_modules/**']
  }
});
