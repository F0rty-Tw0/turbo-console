import type { PackageNode, TaskNode } from '@turbo-console/core';

import { isRunnableTask } from '../../tree/utils/task-filter.util.ts';
import { NO_PACKAGE_TASKS_TEXT } from '../common/picker.const.ts';

/**
 * Spec 1c-b §4.8: the hint a package with no turbo task shows while scripts are hidden; `count` is its offered scripts.
 * The webview keeps its own copy in `webview-ui/src/details/utils/field-text.util.ts`; the two must be equal, since the
 * host cannot import the webview copy.
 */
export const hiddenScriptsText = (count: number): string => `No turbo tasks in this package. Show scripts to see ${count}.`;

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
