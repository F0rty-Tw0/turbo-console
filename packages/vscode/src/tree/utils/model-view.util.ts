import type { PackageNode, WorkspaceModel } from '@turbo-console/core';

import { folderTree } from './folder-tree.util.ts';
import { packageMapOf } from './package-map.util.ts';
import { isVisibleTask } from './task-rows.util.ts';
import type { ModelView } from '../common/model-view.type.ts';

const SCOPED_NAME = /^@[^/]+\/(.+)$/u;

const isShownPackage = (pkg: PackageNode): boolean => pkg.tasks.some(isVisibleTask);

/** The name after `@scope/`, or `null` for a name with no scope (`@a/` and `@x` have none). */
const restOf = (name: string): string | null => {
  const match = SCOPED_NAME.exec(name);

  return match?.[1] ?? null;
};

const countOf = (counts: Map<string, number>, key: string): void => {
  const count = counts.get(key) ?? 0;

  counts.set(key, count + 1);
};

/**
 * Spec §4.8: a scoped name reads its rest, unless that rest is the rest of another shown scoped package or the name of
 * a shown unscoped one; then it keeps its full name, so no two rows of a root read the same text.
 */
const bareLabelsOf = (shown: PackageNode[]): Map<string, string> => {
  const rests = shown.map((pkg) => restOf(pkg.name));
  const counts = new Map<string, number>();

  for (const [index, pkg] of shown.entries()) countOf(counts, rests[index] ?? pkg.name);

  const labelOf = (pkg: PackageNode, index: number): [string, string] => {
    const rest = rests[index] ?? null;
    const isUnique = rest !== null && counts.get(rest) === 1;

    return [pkg.name, isUnique ? rest : pkg.name];
  };
  const labels = shown.map(labelOf);

  return new Map(labels);
};

/** The label a package row reads: its full name while scopes are shown, else its bare label. */
export const shownLabelOf = (view: ModelView, pkg: PackageNode, scopeShown: boolean): string => {
  if (scopeShown) return pkg.name;

  return view.bareLabels.get(pkg.name) ?? pkg.name;
};

export const modelViewOf = (model: WorkspaceModel): ModelView => {
  const shown = model.packages.filter(isShownPackage);
  const packages = packageMapOf(shown);
  const folders = folderTree(shown);
  const bareLabels = bareLabelsOf(shown);
  const view: ModelView = { packages, folders, bareLabels };

  return view;
};
