import type { ProbeState } from './graph-probe.type.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';

/** How the canvas paints each package and each link, by one of the four state classes. */
export type Paint = {
  readonly nodeState: (name: string) => ProbeState;
  readonly edgeState: (edge: GraphEdge) => ProbeState;
};
