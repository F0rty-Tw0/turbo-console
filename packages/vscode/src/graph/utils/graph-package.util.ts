import { join } from 'node:path';

import type { GraphEdge, GraphPackage, GraphReady } from '@turbo-console/webview-ui';

import { MANIFEST_FILE } from '../common/graph.const.ts';

type ManifestFiles = {
  readonly shown: string;
  readonly absolute: string;
};

/** The names of `packages`, in their order. */
export const packageNamesOf = (packages: GraphPackage[]): string[] => packages.map((pkg) => pkg.name);

/** `shown` is the manifest's path under the workspace root as the page names it; `absolute` is the file to read. */
export const manifestFilesOf = (root: string, pkg: GraphPackage): ManifestFiles => {
  const isRootPackage = pkg.path === '';
  const shown = isRootPackage ? MANIFEST_FILE : `${pkg.path}/${MANIFEST_FILE}`;
  const absolute = join(root, pkg.path, MANIFEST_FILE);
  const files: ManifestFiles = { shown, absolute };

  return files;
};

export const packagesByName = (state: GraphReady): Map<string, GraphPackage> => {
  const byName = new Map<string, GraphPackage>();

  for (const pkg of state.packages) byName.set(pkg.name, pkg);

  return byName;
};

export const hasEdge = (edges: GraphEdge[], source: string, target: string): boolean => {
  const isEdge = (edge: GraphEdge): boolean => edge.source === source && edge.target === target;

  return edges.some(isEdge);
};
