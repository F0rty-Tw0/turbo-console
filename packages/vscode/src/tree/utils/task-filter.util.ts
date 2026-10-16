import type { TaskNode } from '@turbo-console/core';

export const isVisibleTask = (task: TaskNode): boolean => task.kind !== 'atom-file';

/** Spec 1c-a §4.1: only a visible task some turbo config defines is offered to Run, Copy and the pickers. */
export const isRunnableTask = (task: TaskNode): boolean => isVisibleTask(task) && task.isTurboTask;

/** Default string order, so the same names sort the same on every machine. */
export const byName = (left: TaskNode, right: TaskNode): number => Number(left.name > right.name) - Number(left.name < right.name);
