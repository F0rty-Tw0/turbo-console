import { defineConfig, globalIgnores } from 'eslint/config';

const ACQUIRE_VS_CODE_API_MESSAGE = 'Only src/bridge/ may touch acquireVsCodeApi; go through the bridge.';

const DERIVED_TYPE_MESSAGE = 'Name the type: import the one the function or library declares, or export an alias.';

export const workspaceConfig = defineConfig([
  globalIgnores(
    [
      '**/dist',
      '**/dist-test',
      '**/tmp/**',
      '**/.bench/**',
      '**/.vscode-test/**',
      '**/test/fixtures/**',
      '**/test-results/**',
      '**/playwright-report/**'
    ],
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
    // nodenext type resolution rejects a directory import, so './index.ts' stays spelled out.
    name: 'workspace/index-imports',
    files: ['**/*.{ts,tsx,cts,mts}'],
    rules: {
      'import-x/no-useless-path-segments': ['error', { noUselessIndex: false }]
    }
  },
  {
    // A type derived from a value has no name and changes when the value does.
    name: 'workspace/derived-types',
    files: ['**/*.{ts,tsx,cts,mts}'],
    rules: {
      '@typescript-eslint/no-restricted-types': [
        'error',
        {
          types: {
            ReturnType: DERIVED_TYPE_MESSAGE,
            Parameters: DERIVED_TYPE_MESSAGE,
            ConstructorParameters: DERIVED_TYPE_MESSAGE,
            InstanceType: DERIVED_TYPE_MESSAGE,
            ThisParameterType: DERIVED_TYPE_MESSAGE
          }
        }
      ]
    }
  },
  {
    // The preset switches this off for specs and e2e; a cast there hides a stub that no longer matches its type.
    name: 'workspace/spec-type-assertions',
    files: ['**/*.spec.ts', '**/*.e2e.ts'],
    rules: {
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }]
    }
  },
  {
    // Spec shape: one root describe with every hook inside it, describes start FEATURE: / GIVEN / WHEN, cases start WHEN
    // or THEN. Lint cannot check that the root is the FEATURE one, nor a title built with ${} or +.
    name: 'workspace/spec-tree',
    files: ['**/*.spec.ts'],
    rules: {
      'vitest/valid-title': [
        'error',
        {
          mustMatch: {
            describe: ['^(FEATURE: |GIVEN |WHEN )', 'describe titles start with "FEATURE: ", "GIVEN " or "WHEN "'],
            it: ['^(WHEN |THEN )', 'it titles start with "WHEN " or "THEN "'],
            test: ['^(WHEN |THEN )', 'test titles start with "WHEN " or "THEN "']
          }
        }
      ],
      'vitest/require-top-level-describe': ['error', { maxNumberOfTopLevelDescribes: 1 }]
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
