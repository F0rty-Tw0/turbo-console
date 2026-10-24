import type { GraphTask } from '@turbo-console/webview-ui';

import type { PickItem } from '../../run/common/picker.type.ts';

const itemOf = (task: GraphTask, root: string): PickItem => {
  const item: PickItem = { label: task.name, description: task.packageName, root, value: task.id };

  return item;
};

/** One row per task of `root` for the Show Task Graph picker: the task name, its package beside it, and its id as the value. */
export const taskGraphItemsOf = (tasks: GraphTask[], root: string): PickItem[] => tasks.map((task) => itemOf(task, root));
