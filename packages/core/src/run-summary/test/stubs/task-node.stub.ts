import type { TaskNode } from '../../../workspace/common/workspace-model.type.ts';

/** A plain `build` task of package `web`, matching `RUN_SUMMARY_STUB`. */
export const TASK_NODE_STUB: TaskNode = {
  id: 'web#build',
  name: 'build',
  command: 'vite build',
  description: null,
  tags: [],
  dependencies: [],
  kind: 'task',
  atom: null
};
