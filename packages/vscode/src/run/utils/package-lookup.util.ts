import type { PackageNode, WorkspaceModel } from '@turbo-console/core';

const MANIFEST = 'package.json';

const posixOf = (path: string): string => path.replaceAll('\\', '/');

/**
 * `file` without its leading `root` and the separator after it, as `file` spells it. The editor has already shown that
 * `root` holds `file` under its case rules, so the lengths agree even when the two differ in case; `''` for `root`
 * itself. A filesystem or drive root (`/`, `c:\`) already ends in its separator.
 */
export const relativePathOf = (root: string, file: string): string => {
  const endsInSeparator = /[\\/]$/u.test(root);
  const separatorLength = endsInSeparator ? 0 : 1;

  return file.slice(root.length + separatorLength);
};

/** The package at the repo root (path `""`) of a single-package model; `null` for a monorepo model. */
const rootPackageOf = (model: WorkspaceModel): PackageNode | null => {
  if (!model.singlePackage) return null;

  return model.packages.find((pkg) => posixOf(pkg.path) === '') ?? null;
};

/**
 * The package whose directory holds the manifest at `relative` (a path inside the root, either separator); `null` for
 * the root manifest of a monorepo (a single-package model maps it to its `//` package), a file that is no `package.json`,
 * or a directory no package has. Matched as given, case included.
 */
export const packageForManifest = (relative: string, model: WorkspaceModel): PackageNode | null => {
  const path = posixOf(relative);

  if (path === MANIFEST) return rootPackageOf(model);

  const isManifest = path.endsWith(`/${MANIFEST}`);

  if (!isManifest) return null;

  const directory = path.slice(0, -(MANIFEST.length + 1));

  return model.packages.find((pkg) => posixOf(pkg.path) === directory) ?? null;
};
