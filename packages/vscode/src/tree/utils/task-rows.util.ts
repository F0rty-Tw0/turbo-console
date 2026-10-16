import type { PackageNode, TaskNode } from '@turbo-console/core';

import { isVisibleTask } from './task-filter.util.ts';
import { taskRow } from './task-row.util.ts';
import type { RowContext } from '../common/tree-node.type.ts';
import type { RowScope, TreeRow } from '../common/tree-row.type.ts';

/**
 * The visible tasks of a package (`atom-file` tasks stay hidden), each with its last run's state read at the context's
 * wall clock. Tooltip lines are raw text: `tooltipMarkdownOf` cleans them. The description is built from numbers and
 * fixed words, but is cleaned like every label.
 */
export const taskRows = (scope: RowScope, pkg: PackageNode, context: RowContext): TreeRow[] => {
  const visible = pkg.tasks.filter(isVisibleTask);

  return visible.map((task) => taskRow(scope, pkg, task, context));
};

/** The row of the visible task `taskId` of `pkg`, built alone; a hidden or unknown id has none. */
export const taskRowOf = (scope: RowScope, pkg: PackageNode, taskId: string, context: RowContext): TreeRow | undefined => {
  const isShownTask = (task: TaskNode): boolean => task.id === taskId && isVisibleTask(task);
  const task = pkg.tasks.find(isShownTask);

  if (task === undefined) return undefined;

  return taskRow(scope, pkg, task, context);
};
