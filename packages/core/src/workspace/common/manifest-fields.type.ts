import type { PackageManager } from './workspace-model.type.ts';

/**
 * The values of the root `package.json` the load reads, as parsed and not yet checked: `packageManager`,
 * `devEnginesManager` (the value of `devEngines.packageManager`), the package `name` and `workspaces`.
 */
export type ManifestFields = {
  readonly packageManager: unknown;
  readonly devEnginesManager: unknown;
  readonly name: unknown;
  readonly workspaces: unknown;
};

/** What `detectPackageManager` finds in the root: the manager, and the manifest's `name` and `workspaces` as parsed. */
export type DetectedRoot = {
  readonly packageManager: PackageManager;
  readonly name: unknown;
  readonly workspaces: unknown;
};
