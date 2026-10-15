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

const TEXT_ONLY_MESSAGE = 'Webview text goes through textContent (spec 1b D3)';

const HTML_SINKS =
  'innerHTML|outerHTML|insertAdjacentHTML|setHTMLUnsafe|parseHTMLUnsafe|createContextualFragment|parseFromString|srcdoc|cssText';

const UNSAFE_ATTRIBUTES = 'srcdoc|style|on.*|href|src|action|formaction|xlink:href';

const restrictedSyntaxOf = (config: FlatConfig.Config): unknown[] => {
  const rule = config.rules?.['no-restricted-syntax'];

  if (!Array.isArray(rule)) return [];

  return rule.slice(1);
};

// A rule set here replaces the inherited one, so lint-suite's own bans are carried over.
const inheritedRestrictedSyntax = recommended.flatMap(restrictedSyntaxOf);

/** Spec 1b D3: no HTML sink in webview code, so repo text reaches the DOM only as text. */
const textOnlyDom: FlatConfig.Config = {
  name: 'webview-ui/text-only-dom',
  files: ['**/*.ts'],
  rules: {
    'no-restricted-syntax': [
      'error',
      ...inheritedRestrictedSyntax,
      { selector: `MemberExpression[property.name=/^(${HTML_SINKS})$/]`, message: TEXT_ONLY_MESSAGE },
      { selector: `MemberExpression[computed=true][property.value=/^(${HTML_SINKS})$/]`, message: TEXT_ONLY_MESSAGE },
      // Object.assign(el, { innerHTML }) and const { innerHTML } = el.
      { selector: `Property[key.name=/^(${HTML_SINKS})$/]`, message: TEXT_ONLY_MESSAGE },
      // A sink name as a string: Reflect.set(el, 'innerHTML', x), Object.defineProperty, { 'innerHTML': x }.
      { selector: `Literal[value=/^(${HTML_SINKS})$/]`, message: TEXT_ONLY_MESSAGE },
      { selector: `TemplateElement[value.cooked=/(${HTML_SINKS})/]`, message: TEXT_ONLY_MESSAGE },
      {
        selector: 'CallExpression[callee.property.name=/^(write|writeln|execCommand|setAttributeNS)$/]',
        message: TEXT_ONLY_MESSAGE
      },
      { selector: "CallExpression[callee.property.name='setAttribute'][arguments.0.type!='Literal']", message: TEXT_ONLY_MESSAGE },
      {
        selector: `CallExpression[callee.property.name='setAttribute'][arguments.0.value=/^(${UNSAFE_ATTRIBUTES})$/i]`,
        message: TEXT_ONLY_MESSAGE
      },
      // A literal key (el.dataset['testid']) names no data; a computed one could.
      {
        selector: "MemberExpression[object.property.name='dataset'][computed=true][property.type!='Literal']",
        message: TEXT_ONLY_MESSAGE
      }
    ]
  }
};

const config: ConfigArray = [
  ...recommended,
  ...vitest,
  ...playwright,
  ...workspaceConfig,
  typescriptFiles,
  pageObjectAssertions,
  textOnlyDom
];

export default config;
