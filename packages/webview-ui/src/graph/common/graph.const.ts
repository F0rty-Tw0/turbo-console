export const NODE_HEIGHT = 32;

export const NODE_PADDING_X = 24;

/** Layered, top-down; the cheapest strategies, because a package graph needs a readable layout, not an optimal one. */
export const ELK_OPTIONS: Readonly<Record<string, string>> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.layered.thoroughness': '1',
  'elk.layered.layering.strategy': 'LONGEST_PATH',
  'elk.layered.nodePlacement.strategy': 'SIMPLE',
  'elk.edgeRouting': 'POLYLINE'
};
