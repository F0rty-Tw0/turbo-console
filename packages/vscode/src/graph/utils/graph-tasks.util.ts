import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { GraphRunState, GraphTask } from '@turbo-console/webview-ui';

import type { RunLookup } from '../../run/common/run.type.ts';
import { isRunnableTask, isVisibleTask } from '../../tree/utils/task-filter.util.ts';

type VisibleTask = { readonly packageName: string; readonly task: TaskNode };

/** Default string order, so the same ids sort the same on every machine. */
const compareId = (left: string, right: string): number => Number(left > right) - Number(left < right);

const visibleOf = (pkg: PackageNode): VisibleTask[] => {
  const tasks = pkg.tasks.filter(isVisibleTask);

  return tasks.map((task) => {
    const visible: VisibleTask = { packageName: pkg.name, task };

    return visible;
  });
};

const visibleTasksOf = (model: WorkspaceModel): VisibleTask[] => model.packages.flatMap(visibleOf);

const taskOf = ({ packageName, task }: VisibleTask, listed: ReadonlySet<string>): GraphTask => {
  const dependencies = task.dependencies.filter((id) => listed.has(id)).toSorted(compareId);
  const graphTask: GraphTask = {
    id: task.id,
    packageName,
    name: task.name,
    command: task.command,
    isRunnable: isRunnableTask(task),
    dependencies
  };

  return graphTask;
};

/**
 * Every visible task of every package, sorted by id; the tree's scripts toggle does not apply, so scripts that are not turbo tasks
 * are listed. `dependencies` keep only listed ids, sorted.
 */
export const graphTasksOf = (model: WorkspaceModel): GraphTask[] => {
  const visible = visibleTasksOf(model);
  const listed = new Set(visible.map(({ task }) => task.id));

  return visible.map((entry) => taskOf(entry, listed)).toSorted((left, right) => compareId(left.id, right.id));
};

/** The run state of each listed task that has a run under `root`; unlisted ids and other roots never appear. */
export const runsMapOf = (root: string, tasks: GraphTask[], get: RunLookup): Record<string, GraphRunState> => {
  const runs: Record<string, GraphRunState> = {};

  for (const { id } of tasks) {
    const state = get(root, id)?.state;

    if (state !== undefined) runs[id] = state;
  }

  return runs;
};
