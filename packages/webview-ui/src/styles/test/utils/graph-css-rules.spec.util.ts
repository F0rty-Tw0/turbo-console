import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const RULE_PATTERN = /([^{}]+)\{([^{}]*)\}/g;

const COMMENT_PATTERN = /\/\*[\s\S]*?\*\//g;

export const rawCss = readFileSync(join(import.meta.dirname, '..', '..', 'graph.css'), 'utf8');

export const css = rawCss.replace(COMMENT_PATTERN, '');

export const selectorOf = (match: RegExpExecArray): string => {
  const selector = match[1] ?? '';

  return selector.trim().replace(/\s+/g, ' ');
};

export const bodyOf = (match: RegExpExecArray): string => match[2] ?? '';

const hasSelector = (rule: RegExpExecArray, selector: string): boolean => {
  const list = selectorOf(rule);
  const selectors = list.split(/\s*,\s*/);

  return selectors.includes(selector);
};

/** The first rule whose selector list holds exactly `selector`, ignoring whitespace. */
export const ruleOf = (text: string, selector: string): RegExpExecArray | undefined => {
  const matches = text.matchAll(RULE_PATTERN);
  const rules = Array.from(matches);

  return rules.find((rule) => hasSelector(rule, selector));
};

export const declarationsOf = (text: string, selector: string): string => {
  const rule = ruleOf(text, selector);

  if (rule === undefined) return '';

  return bodyOf(rule);
};
