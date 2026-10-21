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

/**
 * webview-ui code is for the webview page; the extension bundle may take its types, the two HTML-shell helpers, the two
 * pure duration formatters, the pure hidden-scripts hint and the icon-id pattern, tool-icon prefix and graph limit constants only.
 */
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
            allowImportNames: [
              'ENTRY_TEXT_MAX',
              'ICON_ID_PATTERN',
              'MANIFEST_ENTRIES_MAX',
              'MANIFEST_FIELDS',
              'MANIFEST_FILE_MAX',
              'MANIFEST_LINE_MAX',
              'TASK_COUNT_MAX',
              'TOOL_ICON_PREFIX',
              'durationText',
              'elapsedText',
              'graphCsp',
              'hiddenScriptsText',
              'renderWebviewHtml',
              'webviewCsp'
            ],
            message:
              'Types, HTML-shell helpers, pure text formatters and the icon-id pattern, tool-icon prefix and graph limit constants only: webview code must not enter the extension bundle.'
          }
        ]
      }
    ]
  }
};

const config: ConfigArray = [...recommended, ...vitest, ...playwright, ...workspaceConfig, typescriptFiles, webviewHostImports];

export default config;
