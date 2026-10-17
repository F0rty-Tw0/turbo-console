import type { PackageNode, TaskNode } from '@turbo-console/core';

import { byName, isRunnableTask, isVisibleTask } from '../../tree/utils/task-filter.util.ts';
import type { CardTasks, DetailsInput } from '../common/details.type.ts';

/** Spec 1c-b §4.10: while scripts are hidden a script has no card, unless its run is live. */
const isLeftOutBy = (input: DetailsInput): ((task: TaskNode) => boolean) => {
  const isLeftOut = (task: TaskNode): boolean => {
    if (task.isTurboTask || input.scriptsShown) return false;

    return input.runs(input.root, task.id)?.state !== 'running';
  };

  return isLeftOut;
};

const isKeptBy = (input: DetailsInput): ((task: TaskNode) => boolean) => {
  const isLeftOut = isLeftOutBy(input);
  const isKept = (task: TaskNode): boolean => !isLeftOut(task);

  return isKept;
};

/** The visible tasks of `pkg` the toggle lets through, by name, and the offered scripts it left out. */
export const cardTasksOf = (pkg: PackageNode, input: DetailsInput): CardTasks => {
  const visible = pkg.tasks.filter(isVisibleTask).toSorted(byName);
  const shown = visible.filter(isKeptBy(input));
  const leftOut = visible.filter(isLeftOutBy(input));
  const hiddenScriptCount = leftOut.filter(isRunnableTask).length;
  const tasks: CardTasks = { shown, hiddenScriptCount };

  return tasks;
};
