import type { PackageNode, WorkspaceModel } from '@turbo-console/core';

import { hasVisibleTurboTask, isLiveScript } from './script-task.util.ts';
import { HIDDEN_KEY, KEY_SEPARATOR, SHOWN_KEY } from '../common/view-key.const.ts';

const liveIdsOfPackage = (pkg: PackageNode, liveOfRoot: ReadonlySet<string>): string[] => {
  const isTurboPackage = hasVisibleTurboTask(pkg);

  if (isTurboPackage) return [];

  const scripts = pkg.tasks.filter((task) => isLiveScript(task, liveOfRoot));

  return scripts.map((task) => task.id);
};

/**
 * Spec 1c-b §4.7: `'shown'` while scripts are shown; else `'hidden'`, then the live ids that are scripts of packages with
 * no visible turbo task (the only ids that can change the shown set), sorted and joined by NUL. `liveOfRoot` is the set of
 * the folder root; a new `Set` of the same ids gives the same key.
 */
export const viewKeyOf = (model: WorkspaceModel, scriptsShown: boolean, liveOfRoot: ReadonlySet<string>): string => {
  if (scriptsShown) return SHOWN_KEY;

  if (liveOfRoot.size === 0) return HIDDEN_KEY;

  const ids = model.packages.flatMap((pkg) => liveIdsOfPackage(pkg, liveOfRoot));

  if (ids.length === 0) return HIDDEN_KEY;

  ids.sort();

  const parts = [HIDDEN_KEY, ...ids];

  return parts.join(KEY_SEPARATOR);
};
