/** The fallback graph by child index: one entry per child of the ELK graph, in child order. */
export type FallbackLinks = {
  /** Each child's targets, one per distinct leaf pair, in edge input order. */
  targets: number[][];
  /** Each child's distinct other ends, incoming or outgoing, in the order its edges were given. */
  neighbours: number[][];
  /** How many distinct children point at each child, self-loops left out. */
  indegree: Int32Array;
};
