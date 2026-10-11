import { playwright, recommended, vitest } from 'lint-suite/eslint';
import type { ConfigArray } from 'typescript-eslint';

import { workspaceConfig } from '../../eslint.config.base.ts';

const languageOptions = {
  parserOptions: {
    tsconfigRootDir: import.meta.dirname
  }
};

const typescriptFiles = {
  name: 'vscode/typescript',
  files: ['**/*.ts'],
  languageOptions
};

const config: ConfigArray = [...recommended, ...vitest, ...playwright, ...workspaceConfig, typescriptFiles];

export default config;
