import { folderTitleOf } from './controls-text.util.ts';
import { ownerTextOf } from './owner-text.util.ts';
import { ROOT_TASK_PACKAGE } from '../common/graph-task.const.ts';
import { PACKAGES_CRUMB, TASKS_CRUMB_STEM } from '../common/location.const.ts';
import type { LocationCrumb, LocationState } from '../common/location.type.ts';

const crumbOf = (kind: LocationCrumb['kind'], label: string, name: string): LocationCrumb => {
  const crumb: LocationCrumb = { kind, label, name, isCurrent: false };

  return crumb;
};

/** "Packages", then the focused folder's title when one is focused. */
const packageTrailOf = (folder: string | null): LocationCrumb[] => {
  const packages = crumbOf('packages', PACKAGES_CRUMB, '');

  if (folder === null) return [packages];

  const title = folderTitleOf(folder);
  const focused = crumbOf('folder', title, folder);

  return [packages, focused];
};

/** The crumb of the one package of the chosen tasks, labelled by `ownerTextOf`: a root crumb for the root, else a package crumb. */
const ownerCrumbOf = (taskPackage: string, labels: ReadonlyMap<string, string>): LocationCrumb => {
  const label = ownerTextOf(taskPackage, null, labels);

  if (taskPackage === ROOT_TASK_PACKAGE) return crumbOf('root', label, '');

  return crumbOf('package', label, taskPackage);
};

/**
 * "Packages", the one package of the chosen tasks when there is one, then "Tasks (n)"; a folder focus is not shown. A
 * single package has no package mode to go back to, so its trail is "Tasks (n)" alone.
 */
const taskTrailOf = (state: LocationState): LocationCrumb[] => {
  const { taskPackage, taskCount, isSinglePackage, labels } = state;
  const packages = crumbOf('packages', PACKAGES_CRUMB, '');
  const tasks = crumbOf('tasks', `${TASKS_CRUMB_STEM} (${taskCount})`, '');

  if (isSinglePackage) return [tasks];

  if (taskPackage === null) return [packages, tasks];

  const owner = ownerCrumbOf(taskPackage, labels);

  return [packages, owner, tasks];
};

const trailOf = (state: LocationState): LocationCrumb[] => {
  if (state.mode === 'tasks') return taskTrailOf(state);

  return packageTrailOf(state.folder);
};

/** The location bar's crumbs for `state`, the last one current. */
export const locationCrumbsOf = (state: LocationState): LocationCrumb[] => {
  const trail = trailOf(state);
  const lastIndex = trail.length - 1;
  const marked = (crumb: LocationCrumb, index: number): LocationCrumb => {
    const isCurrent = index === lastIndex;
    const result: LocationCrumb = { ...crumb, isCurrent };

    return result;
  };

  return trail.map(marked);
};
