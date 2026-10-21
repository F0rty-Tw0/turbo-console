/** The packages a selection needs (`dependencies`) and the packages that need it (`dependents`), transitively. */
export type Closure = {
  readonly dependencies: Set<string>;
  readonly dependents: Set<string>;
};
