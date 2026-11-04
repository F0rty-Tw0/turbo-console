import type { BoundingBox12, EdgeSingular } from 'cytoscape';

import type { Position, Routes } from '../../bridge/common/graph-state.type.ts';

/** A collapsed folder end of a folder link: where the link lands and the box its bends must leave. */
export type CollapsedEnd = {
  readonly centre: Position;
  readonly box: BoundingBox12;
};

/**
 * What the folder pass drew per folder link element: the key of the inputs its route was built from, and the links routed
 * since their label was last placed. Keyed by element, so a link Cytoscape removed and added again has no entry.
 */
export type DrawnLinks = {
  readonly keys: WeakMap<EdgeSingular, string>;
  readonly unlabelled: Set<EdgeSingular>;
};

/** What the folder links are routed from: the members per folder, the route record, and what the earlier passes drew. */
export type FolderRouting = {
  readonly members: ReadonlyMap<string, string[]>;
  readonly routes: Routes;
  readonly drawn: DrawnLinks;
};
