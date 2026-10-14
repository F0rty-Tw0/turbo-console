/** `structural`: the package set or a package `path` changed, so the root is redrawn; `changed`: names whose node differs. */
export type ModelDiff = {
  readonly structural: boolean;
  readonly changed: string[];
};
