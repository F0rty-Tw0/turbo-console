import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'vscode',
    root: import.meta.dirname,
    watch: false,
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    exclude: ['**/*.contract.spec.ts', '**/fixtures/**', '**/tmp/**', '**/node_modules/**']
  }
});
