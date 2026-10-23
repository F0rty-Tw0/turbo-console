import type { GraphTask } from '../../../bridge/common/graph-state.type.ts';

/** One runnable task, `a#build`, with no dependency. */
export const GRAPH_TASK_STUB: GraphTask = {
  id: 'a#build',
  packageName: 'a',
  name: 'build',
  command: 'tsc',
  isRunnable: true,
  dependencies: []
};
