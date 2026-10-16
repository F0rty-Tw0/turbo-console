import type { TaskNode } from '@turbo-console/core';

import { isSafeScriptName } from '../../run/utils/script-name.util.ts';

export const isVisibleTask = (task: TaskNode): boolean => task.kind !== 'atom-file';

/** Spec 1c-b §4.1: a visible task that is a turbo task, or a script whose name passes the run flow's name check. */
export const isRunnableTask = (task: TaskNode): boolean => {
  const isVisible = isVisibleTask(task);

  return isVisible && (task.isTurboTask || isSafeScriptName(task.name));
};

/** Spec 1c-b §4.1: a runnable task the toggle lets through, i.e. any turbo task, or a script while scripts are shown. */
export const isOfferedTask = (task: TaskNode, scriptsShown: boolean): boolean => {
  const isRunnable = isRunnableTask(task);

  return isRunnable && (task.isTurboTask || scriptsShown);
};

/** Default string order, so the same names sort the same on every machine. */
export const byName = (left: TaskNode, right: TaskNode): number => Number(left.name > right.name) - Number(left.name < right.name);
