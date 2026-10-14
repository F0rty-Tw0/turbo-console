import type { PackageNode } from '@turbo-console/core';

export const packageMapOf = (packages: PackageNode[]): Map<string, PackageNode> => {
  const entries = packages.map((pkg): [string, PackageNode] => [pkg.name, pkg]);

  return new Map(entries);
};
