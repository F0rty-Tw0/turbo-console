import { ROOT_TASKS_TITLE, ROOT_TASK_PACKAGE } from '@turbo-console/webview-ui';
import type { GraphTask } from '@turbo-console/webview-ui';

import type { PickItem } from '../../run/common/picker.type.ts';

/** The package a task row names: for the root `//`, `rootLabel`, else the root title; any other package, its name. */
const packageTextOf = (task: GraphTask, rootLabel: string | null): string => {
  if (task.packageName !== ROOT_TASK_PACKAGE) return task.packageName;

  return rootLabel ?? ROOT_TASKS_TITLE;
};

const itemOf = (task: GraphTask, root: string, rootLabel: string | null): PickItem => {
  const description = packageTextOf(task, rootLabel);
  const item: PickItem = { label: task.name, description, root, value: task.id };

  return item;
};

/**
 * One row per task of `root` for the Show Task Graph picker: the task name, its package beside it (for a `//` task, the
 * `//` package's `rootLabel` when there is one, else "Workspace root (//)"), and its id as the value.
 */
export const taskGraphItemsOf = (tasks: GraphTask[], root: string, rootLabel: string | null): PickItem[] =>
  tasks.map((task) => itemOf(task, root, rootLabel));
