import { folderTitleOf } from './controls-text.util.ts';
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

/** "Packages", the one package of the chosen tasks when there is one, then "Tasks (n)"; a folder focus is not shown. */
const taskTrailOf = (taskPackage: string | null, taskCount: number): LocationCrumb[] => {
  const packages = crumbOf('packages', PACKAGES_CRUMB, '');
  const tasks = crumbOf('tasks', `${TASKS_CRUMB_STEM} (${taskCount})`, '');

  if (taskPackage === null) return [packages, tasks];

  const owner = crumbOf('package', taskPackage, taskPackage);

  return [packages, owner, tasks];
};

const trailOf = (state: LocationState): LocationCrumb[] => {
  if (state.mode === 'tasks') return taskTrailOf(state.taskPackage, state.taskCount);

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
