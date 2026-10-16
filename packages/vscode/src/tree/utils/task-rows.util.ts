import type { PackageNode, TaskNode } from '@turbo-console/core';

import { groupRowOf } from './script-rows.util.ts';
import { isVisibleTurboTask } from './script-task.util.ts';
import { isVisibleTask } from './task-filter.util.ts';
import { taskRow } from './task-row.util.ts';
import type { RowContext } from '../common/tree-node.type.ts';
import type { RowScope, TreeRow } from '../common/tree-row.type.ts';

/**
 * The visible turbo tasks of a package (`atom-file` tasks stay hidden), each with its last run's state read at the
 * context's wall clock, then its Scripts group when it holds any (scripts are rows of the group, not of the package).
 */
export const taskRows = (scope: RowScope, pkg: PackageNode, context: RowContext): TreeRow[] => {
  const turbo = pkg.tasks.filter(isVisibleTurboTask);
  const rows = turbo.map((task) => taskRow(scope, pkg, task, context));
  const group = groupRowOf(scope, pkg, context);

  if (group === null) return rows;

  return [...rows, group];
};

/** The row of the visible task `taskId` of `pkg`, built alone; a hidden or unknown id has none. */
export const taskRowOf = (scope: RowScope, pkg: PackageNode, taskId: string, context: RowContext): TreeRow | undefined => {
  const isShownTask = (task: TaskNode): boolean => task.id === taskId && isVisibleTask(task);
  const task = pkg.tasks.find(isShownTask);

  if (task === undefined) return undefined;

  return taskRow(scope, pkg, task, context);
};
