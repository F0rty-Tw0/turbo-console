import type { TaskNode } from '@turbo-console/core';

import { hasScriptBody } from '../../run/utils/run-refusal.util.ts';
import { isSafeScriptName } from '../../run/utils/script-name.util.ts';

export const isVisibleTask = (task: TaskNode): boolean => task.kind !== 'atom-file';

const isRunnableScript = (task: TaskNode): boolean => isSafeScriptName(task.name) && hasScriptBody(task);

/**
 * Spec 1c-b §4.1: a visible task that is a turbo task, or a script whose name and body pass the run flow's checks. The
 * package dir's `isWithin` check stays out and Run keeps it as the gate: a package whose path leaves the root is
 * offered, then refused with the unsafe-script toast. turbo 2.11.7 refuses only a package dir symlinked outside the root.
 */
export const isRunnableTask = (task: TaskNode): boolean => {
  const isVisible = isVisibleTask(task);
  const isRunnable = task.isTurboTask || isRunnableScript(task);

  return isVisible && isRunnable;
};

/** Spec 1c-b §4.1: a runnable task the toggle lets through, i.e. any turbo task, or a script while scripts are shown. */
export const isOfferedTask = (task: TaskNode, scriptsShown: boolean): boolean => {
  const isRunnable = isRunnableTask(task);

  return isRunnable && (task.isTurboTask || scriptsShown);
};

/** Default string order, so the same names sort the same on every machine. */
export const byName = (left: TaskNode, right: TaskNode): number => Number(left.name > right.name) - Number(left.name < right.name);
