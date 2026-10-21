export const NODE_HEIGHT = 32;

export const NODE_PADDING_X = 24;

/** The one Trusted Types policy the graph CSP allows (`trusted-types tc-elk`). */
export const ELK_POLICY_NAME = 'tc-elk';

export const FALLBACK_TIMEOUT_MS = 5000;

/** Fallback row pitch in node heights. */
export const FALLBACK_SPACING_FACTOR = 3;

/** Layered, top-down; the cheapest strategies, because a package graph needs a readable layout, not an optimal one. */
export const ELK_OPTIONS: Readonly<Record<string, string>> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.layered.thoroughness': '1',
  'elk.layered.layering.strategy': 'LONGEST_PATH',
  'elk.layered.nodePlacement.strategy': 'SIMPLE',
  'elk.edgeRouting': 'POLYLINE'
};
