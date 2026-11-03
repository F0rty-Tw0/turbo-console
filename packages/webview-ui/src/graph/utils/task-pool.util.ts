import type { GraphTask } from '../../bridge/common/graph-state.type.ts';

const isTurboTask = (task: GraphTask): boolean => task.isTurboTask;

/** The tasks task mode draws and counts: the turbo tasks, plus the package scripts when `scriptsShown`; order kept. */
export const taskPoolOf = (tasks: GraphTask[], scriptsShown: boolean): GraphTask[] => {
  if (scriptsShown) return tasks;

  return tasks.filter(isTurboTask);
};
