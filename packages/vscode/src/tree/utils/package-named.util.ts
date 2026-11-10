import type { PackageNode, WorkspaceModel } from '@turbo-console/core';

/** Whether `model` holds a package named `packageName`; no model holds none. */
export const hasPackageNamed = (model: WorkspaceModel | null, packageName: string): boolean => {
  const packages = model?.packages ?? [];
  const isNamed = (pkg: PackageNode): boolean => pkg.name === packageName;

  return packages.some(isNamed);
};
