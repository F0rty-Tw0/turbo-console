import { defineConfig, globalIgnores } from 'eslint/config';

const ACQUIRE_VS_CODE_API_MESSAGE = 'Only src/bridge/ may touch acquireVsCodeApi; go through the bridge.';

export const workspaceConfig = defineConfig([
  globalIgnores(
    ['**/dist', '**/dist-test', '**/tmp/**', '**/.bench/**', '**/.vscode-test/**', '**/test/fixtures/**'],
    'workspace/ignores'
  ),
  {
    name: 'workspace/acquire-vs-code-api',
    files: ['**/*.ts', '**/*.js'],
    ignores: ['**/src/bridge/**'],
    rules: {
      'no-restricted-globals': ['error', { name: 'acquireVsCodeApi', message: ACQUIRE_VS_CODE_API_MESSAGE }],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'acquireVsCodeApi', message: ACQUIRE_VS_CODE_API_MESSAGE },
        { object: 'globalThis', property: 'acquireVsCodeApi', message: ACQUIRE_VS_CODE_API_MESSAGE }
      ]
    }
  },
  {
    name: 'workspace/entry-points',
    files: ['**/*.ts'],
    rules: {
      'local/no-unused-exports': [
        'error',
        {
          entryPoints: [
            '**/main.ts',
            '**/main.*.ts',
            '**/public-api.ts',
            '**/index.ts',
            '**/*.config.ts',
            '**/*.config.mts',
            '**/*.config.cts',
            '**/*.spec.ts',
            '**/*.spec.util.ts',
            '**/*.stub.ts',
            '**/*.mock.ts',
            '**/*.d.ts',
            '**/*.stories.ts',
            '**/environment*.ts',
            '**/*.bench.ts',
            '**/*.suite.ts',
            '**/extension.ts'
          ]
        }
      ]
    }
  }
]);
