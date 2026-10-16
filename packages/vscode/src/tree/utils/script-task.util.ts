import type { PackageNode, TaskNode } from '@turbo-console/core';

import { isVisibleTask } from './task-rows.util.ts';

/** Spec 1c-b §4.1: a visible task that is not a turbo task, one a `package.json` script defines. */
const isVisibleScript = (task: TaskNode): boolean => isVisibleTask(task) && !task.isTurboTask;

/** Spec 1c-b §4.1: a turbo task, or a script while scripts are shown. Until the pickers move, this is the count a package shows. */
export const isOfferedTask = (task: TaskNode, scriptsShown: boolean): boolean => {
  const isVisible = isVisibleTask(task);

  return isVisible && (task.isTurboTask || scriptsShown);
};

/** A script whose run is live: it keeps its package in the tree while scripts are hidden. */
export const isLiveScript = (task: TaskNode, liveOfRoot: ReadonlySet<string>): boolean => {
  const isScript = isVisibleScript(task);

  return isScript && liveOfRoot.has(task.id);
};

const isVisibleTurboTask = (task: TaskNode): boolean => isVisibleTask(task) && task.isTurboTask;

export const hasVisibleTurboTask = (pkg: PackageNode): boolean => pkg.tasks.some(isVisibleTurboTask);
