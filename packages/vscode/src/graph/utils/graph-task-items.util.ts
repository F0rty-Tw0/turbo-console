import type { GraphTask } from '@turbo-console/webview-ui';

import type { PickItem } from '../../run/common/picker.type.ts';

const itemOf = (task: GraphTask, root: string, rootLabel: string | null): PickItem => {
  const description = rootLabel ?? task.packageName;
  const item: PickItem = { label: task.name, description, root, value: task.id };

  return item;
};

/**
 * One row per task of `root` for the Show Task Graph picker: the task name, its package beside it (the single-package
 * `rootLabel` when there is one), and its id as the value.
 */
export const taskGraphItemsOf = (tasks: GraphTask[], root: string, rootLabel: string | null): PickItem[] =>
  tasks.map((task) => itemOf(task, root, rootLabel));
