import type { AtomGroup } from '@turbo-console/core';
import type { GraphAtomGroup, GraphTask } from '@turbo-console/webview-ui';

/** The tasks the task graph lists and the Atomizer groups folded into them. */
export type GraphListing = {
  readonly tasks: GraphTask[];
  readonly atomGroups: GraphAtomGroup[];
};

/**
 * How a model's Atomizer groups fold into their umbrellas: `umbrellaOf` maps each hidden aggregate and file task id to its
 * umbrella id, `hidden` holds the aggregate ids the graph does not list, `foldedOf` the raw dependencies each umbrella takes
 * over from its aggregate and files.
 */
export type AtomFold = {
  readonly groups: AtomGroup[];
  readonly umbrellaOf: ReadonlyMap<string, string>;
  readonly hidden: ReadonlySet<string>;
  readonly foldedOf: ReadonlyMap<string, string[]>;
};
