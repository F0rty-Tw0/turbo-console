import type { AtomFile, AtomGroup } from '../common/atom-group.type.ts';
import type { PackageNode, TaskNode, WorkspaceModel } from '../common/workspace-model.type.ts';

const GROUP_SEPARATOR = '--';

const isUmbrella = (task: TaskNode): boolean => task.kind === 'atom-umbrella';

const isFileTask = (task: TaskNode): boolean => task.kind === 'atom-file';

/** Code-unit order, so the sort never depends on a locale. */
const bySpecPath = (left: AtomFile, right: AtomFile): number => {
  if (left.specPath < right.specPath) return -1;

  if (left.specPath > right.specPath) return 1;

  return 0;
};

/** The file of `task` in the group of `umbrella`; `null` when it belongs to another group or lacks the `<group>--` prefix. */
const fileOf = (umbrella: TaskNode, task: TaskNode): AtomFile | null => {
  const group = umbrella.atom?.group;

  if (group === undefined || task.atom?.group !== group) return null;

  const prefix = `${group}${GROUP_SEPARATOR}`;
  const hasPrefix = task.name.startsWith(prefix);

  if (!hasPrefix) return null;

  const specPath = task.name.slice(prefix.length);
  const file: AtomFile = { task, specPath, isLive: task.atom.isLive };

  return file;
};

const filesOf = (pkg: PackageNode, umbrella: TaskNode): AtomFile[] => {
  const fileTasks = pkg.tasks.filter(isFileTask);
  const files = fileTasks.map((task) => fileOf(umbrella, task));
  const found = files.filter((file) => file !== null);

  return found.toSorted(bySpecPath);
};

const groupOf = (pkg: PackageNode, umbrella: TaskNode): AtomGroup | null => {
  const files = filesOf(pkg, umbrella);

  if (files.length === 0) return null;

  const group: AtomGroup = { packageName: pkg.name, umbrella, files };

  return group;
};

const groupsOfPackage = (pkg: PackageNode): AtomGroup[] => {
  const umbrellas = pkg.tasks.filter(isUmbrella);
  const groups = umbrellas.map((umbrella) => groupOf(pkg, umbrella));

  return groups.filter((group) => group !== null);
};

/** One group per `atom-umbrella` task that has files, in package order then task order. */
export const atomGroupsOf = (model: WorkspaceModel): AtomGroup[] => {
  const perPackage = model.packages.map(groupsOfPackage);

  return perPackage.flat();
};
