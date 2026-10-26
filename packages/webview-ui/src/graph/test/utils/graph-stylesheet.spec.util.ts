import type { StylesheetJson, StylesheetJsonBlock } from 'cytoscape';

const isCoreRule = (rule: StylesheetJsonBlock): boolean => rule.selector === 'core';

/** The style of the `core` rule in `stylesheet`, by property name; empty when there is none. */
export const coreStyleOf = (stylesheet: StylesheetJson): Record<string, unknown> => {
  const rule = stylesheet.find(isCoreRule);
  const none: Record<string, unknown> = {};

  if (rule === undefined || !('style' in rule)) return none;

  const entries = Object.entries(rule.style);
  const style: Record<string, unknown> = Object.fromEntries(entries);

  return style;
};
