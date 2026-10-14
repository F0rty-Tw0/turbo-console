import type { PackageNode, WorkspaceModel } from '@turbo-console/core';

const MANIFEST = 'package.json';

const posixOf = (path: string): string => path.replaceAll('\\', '/');

/**
 * `file` without its leading `root` and one separator, as `file` spells it. The editor has already shown that `root`
 * holds `file` under its case rules, so the lengths agree even when the two differ in case; `''` for `root` itself.
 */
export const relativePathOf = (root: string, file: string): string => file.slice(root.length + 1);

/**
 * The package whose directory holds the manifest at `relative` (a path inside the root, either separator); `null` for
 * the root manifest, a file that is no `package.json`, or a directory no package has. Matched as given, case included.
 */
export const packageForManifest = (relative: string, model: WorkspaceModel): PackageNode | null => {
  const path = posixOf(relative);
  const isManifest = path.endsWith(`/${MANIFEST}`);

  if (!isManifest) return null;

  const directory = path.slice(0, -(MANIFEST.length + 1));

  return model.packages.find((pkg) => posixOf(pkg.path) === directory) ?? null;
};
