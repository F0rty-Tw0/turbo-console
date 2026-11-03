import { ROOT_TASKS_TITLE, ROOT_TASK_PACKAGE } from '@turbo-console/webview-ui';
import type { GraphTask } from '@turbo-console/webview-ui';

import type { PickItem } from '../../run/common/picker.type.ts';

/** The package a task row names: the root title for the root `//`, else the package name. */
const packageTextOf = (task: GraphTask): string => (task.packageName === ROOT_TASK_PACKAGE ? ROOT_TASKS_TITLE : task.packageName);

const itemOf = (task: GraphTask, root: string, rootLabel: string | null): PickItem => {
  const description = rootLabel ?? packageTextOf(task);
  const item: PickItem = { label: task.name, description, root, value: task.id };

  return item;
};

/**
 * One row per task of `root` for the Show Task Graph picker: the task name, its package beside it (the single-package
 * `rootLabel` when there is one, else "Workspace root (//)" for the root), and its id as the value.
 */
export const taskGraphItemsOf = (tasks: GraphTask[], root: string, rootLabel: string | null): PickItem[] =>
  tasks.map((task) => itemOf(task, root, rootLabel));
