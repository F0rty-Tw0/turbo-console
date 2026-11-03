/**
 * An ELK route in the terms of Cytoscape's `round-segments` edge with `edge-distances: node-position`: each bend as a
 * weight along the source → target centre line and a distance off it, and each end as an offset from its node's centre.
 */
export type RouteSegments = {
  readonly segWeights: number[];
  readonly segDistances: number[];
  readonly srcEnd: string;
  readonly tgtEnd: string;
};
