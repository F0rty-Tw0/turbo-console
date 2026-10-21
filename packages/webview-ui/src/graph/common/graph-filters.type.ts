/** Show only the packages within `depth` edges of `name`, in both directions. */
export type GraphFocus = {
  readonly name: string;
  readonly depth: number;
};

/** What the controls panel narrows the graph to: unchecked names, a focus, and the tags a package needs one of. */
export type GraphFilters = {
  readonly hidden: ReadonlySet<string>;
  readonly focus: GraphFocus | null;
  readonly tags: ReadonlySet<string>;
};
