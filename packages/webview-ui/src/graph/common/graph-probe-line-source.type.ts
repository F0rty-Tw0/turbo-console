import type { Position } from '../../bridge/common/graph-state.type.ts';

/** An edge end, read for its id. */
export type ProbeLineEnd = {
  readonly id: () => string;
};

/**
 * What `ProbeEdgeLine` reads of a Cytoscape edge; `controlPoints` is `undefined` for a straight edge, and
 * `segmentPoints` for any edge not drawn as segments (only a routed module link is).
 */
export type ProbeLineSource = {
  readonly source: () => ProbeLineEnd;
  readonly target: () => ProbeLineEnd;
  readonly visible: () => boolean;
  readonly sourceEndpoint: () => Position;
  readonly targetEndpoint: () => Position;
  readonly controlPoints: () => Position[] | undefined;
  readonly segmentPoints: () => Position[] | undefined;
  readonly midpoint: () => Position;
};
