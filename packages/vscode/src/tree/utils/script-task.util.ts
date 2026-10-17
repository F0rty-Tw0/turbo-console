import type { PackageNode, TaskNode } from '@turbo-console/core';

import { isVisibleTask } from './task-filter.util.ts';

/** Spec 1c-b §4.1: a visible task that is not a turbo task, one a `package.json` script defines. */
export const isVisibleScript = (task: TaskNode): boolean => isVisibleTask(task) && !task.isTurboTask;

/** A visible turbo task, or a visible script while scripts are shown: the tasks the tree lists, a refused script name included. */
export const isListedTask = (task: TaskNode, scriptsShown: boolean): boolean => {
  const isVisible = isVisibleTask(task);

  return isVisible && (task.isTurboTask || scriptsShown);
};

/** A script whose run is live: it keeps its package in the tree while scripts are hidden. */
export const isLiveScript = (task: TaskNode, liveOfRoot: ReadonlySet<string>): boolean => {
  const isScript = isVisibleScript(task);

  return isScript && liveOfRoot.has(task.id);
};

/** A visible task that is a turbo task; unlike `isRunnableTask`, it stays turbo-only when scripts become runnable. */
export const isVisibleTurboTask = (task: TaskNode): boolean => isVisibleTask(task) && task.isTurboTask;

export const hasVisibleTurboTask = (pkg: PackageNode): boolean => pkg.tasks.some(isVisibleTurboTask);
