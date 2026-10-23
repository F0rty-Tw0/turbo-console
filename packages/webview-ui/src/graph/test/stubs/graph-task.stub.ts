import type { GraphReady, GraphTask, Position } from '../../../bridge/common/graph-state.type.ts';
import type { TaskViewState } from '../../../bridge/common/graph-view-state.type.ts';

/** One runnable task, `a#build`, with no dependency. */
export const GRAPH_TASK_STUB: GraphTask = {
  id: 'a#build',
  packageName: 'a',
  name: 'build',
  command: 'tsc',
  isRunnable: true,
  dependencies: []
};

/** `api#build`, needed by `web#build`. */
export const API_BUILD_STUB: GraphTask = { ...GRAPH_TASK_STUB, id: 'api#build', packageName: 'api' };

/** `web#build`, which needs `api#build`. */
export const WEB_BUILD_STUB: GraphTask = { ...GRAPH_TASK_STUB, id: 'web#build', packageName: 'web', dependencies: ['api#build'] };

/** `web#lint`, standing alone. */
export const WEB_LINT_STUB: GraphTask = { ...GRAPH_TASK_STUB, id: 'web#lint', packageName: 'web', name: 'lint' };

const WEB_TEST: GraphTask = { ...GRAPH_TASK_STUB, id: 'web#test', packageName: 'web', name: 'test', dependencies: ['web#build'] };

/** `web#build` needs `api#build`; `web#lint` stands alone. */
export const TASK_CHAIN_STUB: GraphTask[] = [API_BUILD_STUB, WEB_BUILD_STUB, WEB_LINT_STUB];

/** A graph state of hash `h1` with `TASK_CHAIN_STUB` and no package. */
export const TASK_STATE_STUB: GraphReady = {
  kind: 'graph',
  hash: 'h1',
  packages: [],
  edges: [],
  positions: null,
  folderPositions: null,
  tasks: TASK_CHAIN_STUB
};

/** `TASK_STATE_STUB` with `web#test`, a dependent of `web#build`. */
export const MORE_TASKS_STATE_STUB: GraphReady = { ...TASK_STATE_STUB, tasks: [...TASK_CHAIN_STUB, WEB_TEST] };

/** A task view with `web#build` chosen, one dependent hop, the camera at zoom 1 and no layout yet. */
const ORIGIN: Position = { x: 0, y: 0 };

export const TASK_VIEW_STUB: TaskViewState = {
  chosen: ['web#build'],
  capLifted: false,
  depth: 1,
  selected: null,
  search: '',
  zoom: 1,
  pan: ORIGIN,
  layoutKey: ''
};
