import { playwright, recommended, vitest } from 'lint-suite/eslint';
import type { ConfigArray, FlatConfig } from 'typescript-eslint';

import { workspaceConfig } from '../../eslint.config.base.ts';

const languageOptions = {
  parserOptions: {
    tsconfigRootDir: import.meta.dirname
  }
};

const typescriptFiles = {
  name: 'webview-ui/typescript',
  files: ['**/*.ts'],
  languageOptions
};

const pageObjectAssertions: FlatConfig.Config = {
  name: 'webview-ui/page-object-assertions',
  files: ['**/*.e2e.ts'],
  rules: {
    'playwright/expect-expect': ['warn', { assertFunctionPatterns: ['^expect'] }]
  }
};

const config: ConfigArray = [...recommended, ...vitest, ...playwright, ...workspaceConfig, typescriptFiles, pageObjectAssertions];

export default config;
