import type { Position } from '../../src/bridge/common/graph-state.type.ts';
import type { ProbeEdgeLine, ProbeNode } from '../../src/graph/common/graph-probe.type.ts';

/** The drawn lines, the drawn nodes and the zoom, read in one task so the camera cannot move between them. */
export type RouteRead = {
  readonly lines: ProbeEdgeLine[];
  readonly nodes: ProbeNode[];
  readonly zoom: number;
};

/** The bends of each routed line out of an umbrella, by target: each bend's offset from the umbrella centre, as a fraction of its width and height. */
export type RouteBends = Readonly<Record<string, Position[]>>;
