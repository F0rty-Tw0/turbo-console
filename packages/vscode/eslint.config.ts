import { playwright, recommended, vitest } from 'lint-suite/eslint';
import type { ConfigArray, FlatConfig } from 'typescript-eslint';

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

/** webview-ui code is for the webview page; the extension bundle may take its types, the two HTML-shell helpers and the two pure duration formatters only. */
const webviewHostImports: FlatConfig.Config = {
  name: 'vscode/webview-host-imports',
  files: ['**/*.ts'],
  rules: {
    '@typescript-eslint/no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@turbo-console/webview-ui',
            allowTypeImports: true,
            allowImportNames: ['durationText', 'elapsedText', 'renderWebviewHtml', 'webviewCsp'],
            message: 'Types, HTML-shell helpers and duration formatters only: webview code must not enter the extension bundle.'
          }
        ]
      }
    ]
  }
};

const config: ConfigArray = [...recommended, ...vitest, ...playwright, ...workspaceConfig, typescriptFiles, webviewHostImports];

export default config;
