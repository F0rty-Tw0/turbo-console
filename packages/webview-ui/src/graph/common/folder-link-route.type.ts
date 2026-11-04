import type { BoundingBox12 } from 'cytoscape';

import type { Position } from '../../bridge/common/graph-state.type.ts';

/** A collapsed folder end of a folder link: where the link lands and the box its bends must leave. */
export type CollapsedEnd = {
  readonly centre: Position;
  readonly box: BoundingBox12;
};
