import type { EdgeSingular } from 'cytoscape';

/**
 * What the folder pass drew per folder link element: the key of the inputs its label was placed from, and the links,
 * or reverses of links, changed since their label was last placed. Keyed by element, so a link Cytoscape removed and
 * added again has no entry.
 */
export type DrawnLinks = {
  readonly keys: WeakMap<EdgeSingular, string>;
  readonly unlabelled: Set<EdgeSingular>;
};
