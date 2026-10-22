import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';

/** How a trace runs: `forward` follows `source -> target` from `start`, `backward` the same from `end`. */
export type TraceDirection = 'forward' | 'backward' | 'none';

/** The shortest path between two packages; `path` runs dependent first, `edges` are the graph's own objects. */
export type TraceResult = {
  readonly direction: TraceDirection;
  readonly path: string[];
  readonly edges: GraphEdge[];
};

/** A package the trace could end at, `steps` links away from the start. */
export type TraceCandidate = {
  readonly name: string;
  readonly steps: number;
};

/** The visible packages a trace could end at, grouped by how they relate to the start. */
export type TraceCandidates = {
  readonly forward: TraceCandidate[];
  readonly backward: TraceCandidate[];
  readonly none: string[];
};

/** Which way a walk follows the edges: `source -> target`, or `target -> source`. */
export type WalkDirection = 'dependencies' | 'dependents';

/** A breadth-first walk: each reached package's distance in links, and the package that reached it first. */
export type Walk = {
  readonly distances: Map<string, number>;
  readonly parents: Map<string, string>;
};
