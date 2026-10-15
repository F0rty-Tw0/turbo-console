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

const URL_PROPERTIES = 'href|src|action|formAction';

const baseConfigs: ConfigArray = [...recommended, ...vitest, ...playwright, ...workspaceConfig, typescriptFiles, pageObjectAssertions];

const restrictedSyntaxOf = (config: FlatConfig.Config): unknown[] => {
  const rule = config.rules?.['no-restricted-syntax'];

  if (!Array.isArray(rule)) return [];

  return rule.slice(1);
};

const selectorOf = (entry: unknown): unknown => {
  if (typeof entry === 'object' && entry !== null && 'selector' in entry) return entry.selector;

  return entry;
};

const bySelector = (entry: unknown): [unknown, unknown] => [selectorOf(entry), entry];

// A rule set here replaces every earlier one, so the bans of the configs before it are carried over, once each.
const inheritedEntries = baseConfigs.flatMap(restrictedSyntaxOf);
const entriesBySelector = new Map(inheritedEntries.map(bySelector));
const uniqueEntries = entriesBySelector.values();
const inheritedRestrictedSyntax = [...uniqueEntries];

/** Spec 1b D3: no HTML sink in webview code, so repo text reaches the DOM only as text. */
const textOnlyDom: FlatConfig.Config = {
  name: 'webview-ui/text-only-dom',
  files: ['**/*.{ts,tsx,mts,cts}'],
  rules: {
    'no-restricted-syntax': [
      'error',
      ...inheritedRestrictedSyntax,
      { selector: `MemberExpression[property.name=/^(${HTML_SINKS})$/]`, message: TEXT_ONLY_MESSAGE },
      // Object.assign(el, { innerHTML }) and const { innerHTML } = el.
      { selector: `Property[key.name=/^(${HTML_SINKS})$/]`, message: TEXT_ONLY_MESSAGE },
      // A sink name as a string: el['innerHTML'], Reflect.set(el, 'innerHTML', x), Object.defineProperty, { 'innerHTML': x }.
      { selector: `Literal[value=/^(${HTML_SINKS})$/]`, message: TEXT_ONLY_MESSAGE },
      { selector: "MemberExpression[computed=true][property.type='TemplateLiteral']", message: TEXT_ONLY_MESSAGE },
      {
        selector: "CallExpression[callee.property.name=/^(write|writeln)$/][callee.object.name='document']",
        message: TEXT_ONLY_MESSAGE
      },
      {
        selector: "CallExpression[callee.property.name=/^(write|writeln)$/][callee.object.property.name='document']",
        message: TEXT_ONLY_MESSAGE
      },
      { selector: 'CallExpression[callee.property.name=/^(execCommand|setAttributeNS)$/]', message: TEXT_ONLY_MESSAGE },
      { selector: `AssignmentExpression[left.property.name=/^(${URL_PROPERTIES})$/]`, message: TEXT_ONLY_MESSAGE },
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

const config: ConfigArray = [...baseConfigs, textOnlyDom];

export default config;
