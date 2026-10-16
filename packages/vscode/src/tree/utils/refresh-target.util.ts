import type { WorkspaceModel } from '@turbo-console/core';

import { diffModels } from './model-diff.util.ts';
import { isShownPackage } from './model-view.util.ts';
import type { RootChange } from '../../roots/common/coordinator.type.ts';
import type { RefreshTarget } from '../common/tree-node.type.ts';

const shownNamesOf = (model: WorkspaceModel | null): string[] => {
  const packages = model?.packages ?? [];

  return packages.filter(isShownPackage).map((pkg) => pkg.name);
};

/** Package names are unique once the diff is not structural, so equal sizes and one-way inclusion mean equal sets. */
const isShownSetChanged = (before: WorkspaceModel | null, after: WorkspaceModel): boolean => {
  const previousNames = shownNamesOf(before);
  const previous = new Set(previousNames);
  const next = shownNamesOf(after);
  const isSameSize = previous.size === next.length;

  return !isSameSize || next.some((name) => !previous.has(name));
};

/**
 * Spec §4.3: the root when its error presence or kind changed, its model went away, or the package set or a path
 * changed; spec §4.7: also when the set of shown packages changed (a package with no row cannot be fired, and bare
 * labels depend on that set); otherwise the names of the packages whose node changed (none: nothing to redraw).
 */
export const refreshTarget = (change: RootChange): RefreshTarget => {
  const { before, after } = change;
  const isErrorChanged = change.errorBefore !== change.errorAfter;

  if (isErrorChanged || after === null) return 'root';

  const diff = diffModels(before, after);

  if (diff.structural) return 'root';

  const isShownChanged = isShownSetChanged(before, after);

  return isShownChanged ? 'root' : diff.changed;
};
