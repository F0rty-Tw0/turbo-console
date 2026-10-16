/**
 * The two values of the root `package.json` that name a package manager, as parsed and not yet checked:
 * `packageManager`, and `devEnginesManager`, the value of `devEngines.packageManager`.
 */
export type ManifestFields = {
  readonly packageManager: unknown;
  readonly devEnginesManager: unknown;
};
