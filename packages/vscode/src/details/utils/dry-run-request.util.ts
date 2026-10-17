import type { DryRunRequest, TaskNode, WorkspaceModel } from '@turbo-console/core';

import { isVisibleTask } from '../../tree/utils/task-filter.util.ts';

/**
 * A file task has no card, a task with no command has nothing for turbo to resolve, and a script no turbo config
 * defines would fail the whole call (`turbo run` exits 1 on a task name it cannot find).
 */
const hasDryRun = (task: TaskNode): boolean => {
  const isVisible = isVisibleTask(task);

  return isVisible && task.command !== null && task.isTurboTask;
};

/**
 * The names of the package's shown turbo tasks that have a command, filtered to the package. `null` when the
 * model lacks the package or no task qualifies: no dry run starts.
 */
export const dryRunRequestOf = (model: WorkspaceModel | null, packageName: string): DryRunRequest | null => {
  const pkg = model?.packages.find((candidate) => candidate.name === packageName);
  const tasks = pkg?.tasks.filter(hasDryRun).map((task) => task.name) ?? [];

  if (tasks.length === 0) return null;

  const request: DryRunRequest = { tasks, packages: [packageName] };

  return request;
};
