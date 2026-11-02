import type { GraphTask } from '../../bridge/common/graph-state.type.ts';

/** The tasks task mode draws and counts: the turbo tasks, plus the package scripts when `scriptsShown`; order kept. */
export const taskPoolOf = (tasks: GraphTask[], scriptsShown: boolean): GraphTask[] =>
  tasks.filter((task) => task.isTurboTask || scriptsShown);
