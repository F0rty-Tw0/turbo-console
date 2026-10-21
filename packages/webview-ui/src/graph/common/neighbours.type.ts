/** A package's direct neighbours, each named once, sorted by code unit. */
export type Neighbours = {
  readonly dependencies: string[];
  readonly dependents: string[];
};
