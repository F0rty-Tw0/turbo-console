import type { ShownManifest, ShownTask } from '../common/launch.type.ts';

const isShownBuild = (task: ShownTask): boolean => task.visible && task.kind === 'task' && task.fullName.endsWith('#build');

const byFullName = (left: ShownTask, right: ShownTask): number =>
  Number(left.fullName > right.fullName) - Number(left.fullName < right.fullName);

/** The first of the dependencies of `task` that is in `builds`. */
const buildDependencyOf = (task: ShownTask, builds: Map<string, ShownTask>): ShownTask | undefined => {
  for (const id of task.dependencies) {
    const dependency = builds.get(id);

    if (dependency !== undefined) return dependency;
  }

  return undefined;
};

/**
 * X and Y of spec §5.3 case 3: X is the first shown `build` task by name that depends on another shown `build` task,
 * Y the first such dependency. Case 2 runs X.
 */
export const buildPair = (manifest: ShownManifest): [ShownTask, ShownTask] => {
  const shown = manifest.tasks.filter(isShownBuild);
  const builds = new Map(shown.map((task) => [task.fullName, task]));

  for (const x of shown.toSorted(byFullName)) {
    const y = buildDependencyOf(x, builds);

    if (y !== undefined) return [x, y];
  }

  throw new Error('the manifest has no build task that depends on another');
};
