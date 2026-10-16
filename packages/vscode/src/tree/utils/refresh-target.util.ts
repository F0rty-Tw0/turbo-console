import { isDeepStrictEqual } from 'node:util';

import type { PackageNode, WorkspaceModel } from '@turbo-console/core';

import { diffModels } from './model-diff.util.ts';
import { isShownPackage } from './model-view.util.ts';
import type { RootChange } from '../../roots/common/coordinator.type.ts';
import type { LiveIds } from '../../run/common/run.type.ts';
import type { RefreshTarget } from '../common/tree-node.type.ts';

const shownNamesOf = (model: WorkspaceModel, scriptsShown: boolean, liveOfRoot: ReadonlySet<string>): string[] => {
  const isShown = (pkg: PackageNode): boolean => isShownPackage(pkg, scriptsShown, liveOfRoot);

  return model.packages.filter(isShown).map((pkg) => pkg.name);
};

/**
 * Package names are unique once the diff is not structural, so equal sizes and one-way inclusion mean equal sets. With
 * scripts hidden, an empty set before and after also counts as changed: the root then holds one message row whose kind
 * (`no-turbo-packages` or `no-shown-packages`) can change with the reload, and no package node exists to fire.
 */
const isShownSetChanged = (
  before: WorkspaceModel,
  after: WorkspaceModel,
  scriptsShown: boolean,
  live: ReadonlySet<string>
): boolean => {
  const previousNames = shownNamesOf(before, scriptsShown, live);
  const previous = new Set(previousNames);
  const next = shownNamesOf(after, scriptsShown, live);
  const isSameSize = previous.size === next.length;
  const isMessageOnly = !scriptsShown && next.length === 0 && isSameSize;

  return isMessageOnly || !isSameSize || next.some((name) => !previous.has(name));
};

/**
 * Spec §4.3: the root when its error presence or kind changed, its model went away, or the package set or a path
 * changed; spec §4.7: also when the set of shown packages changed (a package with no row cannot be fired, and bare
 * labels depend on that set); spec 1c-b §4.7: the shown set reads the scripts toggle and the live script runs of
 * `change.root`, and the root also redraws when the package manager changed (Scripts group tooltips name it);
 * otherwise the names of the packages whose node changed (none: nothing to redraw).
 */
export const refreshTarget = (change: RootChange, scriptsShown: boolean, live: LiveIds): RefreshTarget => {
  const { before, after } = change;
  const isErrorChanged = change.errorBefore !== change.errorAfter;

  if (isErrorChanged || before === null || after === null) return 'root';

  const diff = diffModels(before, after);

  if (diff.structural) return 'root';

  const isSameManager = isDeepStrictEqual(before.packageManager, after.packageManager);

  if (!isSameManager) return 'root';

  const isShownChanged = isShownSetChanged(before, after, scriptsShown, live(change.root));

  return isShownChanged ? 'root' : diff.changed;
};
