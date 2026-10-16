import type { PackageNode, WorkspaceModel } from '@turbo-console/core';

import { hasVisibleTurboTask, isVisibleScript } from './script-task.util.ts';
import { HIDDEN_KEY, KEY_SEPARATOR, SHOWN_KEY } from '../common/view-key.const.ts';

const scriptIdsOf = (pkg: PackageNode): string[] => {
  const isTurboPackage = hasVisibleTurboTask(pkg);

  if (isTurboPackage) return [];

  const scripts = pkg.tasks.filter(isVisibleScript);

  return scripts.map((task) => task.id);
};

/** The visible script ids of the packages with no visible turbo task: the only ids that can change the hidden view. One walk of the model; the caller keeps the result per model. */
export const qualifyingIdsOf = (model: WorkspaceModel): ReadonlySet<string> => {
  const ids = model.packages.flatMap(scriptIdsOf);

  return new Set(ids);
};

/**
 * Spec 1c-b §4.7: `'shown'` while scripts are shown; else `'hidden'`, then the live ids that are in the `qualifying` set
 * (asked only when a live id exists), sorted and joined by NUL. The sort is load-bearing: a set iterates in insertion
 * order, and a new `Set` of the same ids must give the same key. `liveOfRoot` is the set of the folder root. A call
 * walks the live ids, not the packages.
 */
export const viewKeyOf = (qualifying: () => ReadonlySet<string>, scriptsShown: boolean, liveOfRoot: ReadonlySet<string>): string => {
  if (scriptsShown) return SHOWN_KEY;

  if (liveOfRoot.size === 0) return HIDDEN_KEY;

  const known = qualifying();
  const ids = Array.from(liveOfRoot).filter((id) => known.has(id));

  if (ids.length === 0) return HIDDEN_KEY;

  ids.sort();

  const parts = [HIDDEN_KEY, ...ids];

  return parts.join(KEY_SEPARATOR);
};
