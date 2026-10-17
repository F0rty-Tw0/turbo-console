import type { PackageNode, TaskNode } from '@turbo-console/core';
import { hiddenScriptsText } from '@turbo-console/webview-ui';

import { isRunnableTask } from '../../tree/utils/task-filter.util.ts';
import { NO_PACKAGE_TASKS_TEXT } from '../common/picker.const.ts';

const isRunnableScript = (task: TaskNode): boolean => !task.isTurboTask && isRunnableTask(task);

/**
 * What to say when a package has nothing to pick: while scripts are hidden and it holds offered scripts, how many (refused
 * names are not counted); else that it has no task.
 */
export const emptyTasksText = (pkg: PackageNode, scriptsShown: boolean): string => {
  if (scriptsShown) return NO_PACKAGE_TASKS_TEXT;

  const count = pkg.tasks.filter(isRunnableScript).length;

  if (count === 0) return NO_PACKAGE_TASKS_TEXT;

  return hiddenScriptsText(count);
};
