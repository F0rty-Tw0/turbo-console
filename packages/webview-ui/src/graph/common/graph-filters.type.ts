import type { GraphFocus } from '../../bridge/common/graph-view-state.type.ts';

/** What the controls panel narrows the graph to: unchecked names, a focus, the focus depth of a package focus, and the tags a package needs one of. */
export type GraphFilters = {
  readonly hidden: ReadonlySet<string>;
  readonly focus: GraphFocus | null;
  readonly depth: number;
  readonly tags: ReadonlySet<string>;
};
