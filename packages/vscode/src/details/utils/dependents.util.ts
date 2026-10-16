import type { WorkspaceModel } from '@turbo-console/core';

import { isVisibleTask } from '../../tree/utils/task-filter.util.ts';

/** Appends in place, so a task with k dependents costs O(k) in total, never O(k²). */
const addDependent = (dependents: Map<string, string[]>, dependency: string, taskId: string): void => {
  const known = dependents.get(dependency);

  if (known === undefined) {
    dependents.set(dependency, [taskId]);

    return;
  }

  known.push(taskId);
};

/**
 * The inverse of every shown task's `dependencies`, across packages: task id to the ids of the tasks that depend on it,
 * sorted. Built from the model, not the dry run. An `atom-file` task has no card, so it is never a dependent.
 */
export const dependentsOf = (model: WorkspaceModel): ReadonlyMap<string, string[]> => {
  const dependents = new Map<string, string[]>();
  const tasks = model.packages.flatMap((pkg) => pkg.tasks).filter(isVisibleTask);

  for (const task of tasks) {
    for (const dependency of task.dependencies) addDependent(dependents, dependency, task.id);
  }

  const sorted = Array.from(dependents, ([dependency, ids]): [string, string[]] => [dependency, ids.toSorted()]);

  return new Map(sorted);
};
