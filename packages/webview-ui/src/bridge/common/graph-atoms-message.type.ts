/** What a file of an Atomizer group last did, or `none` when nothing is known of it. */
export type GraphAtomOutcome = 'passed' | 'failed' | 'cached' | 'none';

/** An umbrella's counts: `cached` is null until the dry run settled, `failed` null until the results settled. */
export type GraphAtomCounts = {
  readonly files: number;
  readonly cached: number | null;
  readonly failed: number | null;
};

/** The counts of one umbrella and the outcome of each of its files, by file task id. */
export type GraphAtomGroupState = {
  readonly counts: GraphAtomCounts;
  readonly files: Record<string, GraphAtomOutcome>;
};

/** The state of every Atomizer group of the graph, by umbrella id. */
export type GraphAtomsMessage = {
  readonly type: 'atoms';
  readonly groups: Record<string, GraphAtomGroupState>;
};
