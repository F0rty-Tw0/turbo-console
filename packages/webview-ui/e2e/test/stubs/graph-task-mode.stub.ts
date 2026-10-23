import type { GraphEdge, GraphReady, GraphTask } from '../../../src/bridge/common/graph-state.type.ts';
import { packageOf, packagesOf } from '../utils/graph-package.spec.util.ts';

const taskOf = (packageName: string, name: string, dependencies: string[]): GraphTask => {
  const task: GraphTask = { id: `${packageName}#${name}`, packageName, name, command: name, isRunnable: true, dependencies };

  return task;
};

/** `app#build` needs `lib#build`, which needs `ui#build`; `app#lint`, `lib#test` and `ui#test` are no dependents of `app#build`. */
const TASKS: GraphTask[] = [
  taskOf('app', 'build', ['lib#build']),
  taskOf('app', 'lint', []),
  taskOf('lib', 'build', ['ui#build']),
  taskOf('lib', 'test', ['lib#build']),
  taskOf('ui', 'build', []),
  taskOf('ui', 'test', ['ui#build'])
];

const EDGES: GraphEdge[] = [
  { source: 'app', target: 'lib' },
  { source: 'lib', target: 'ui' }
];

/** Six tasks in packages `app`, `lib` and `ui`, hash `7a5c0001`, no cached positions. */
export const TASK_MODE_STATE_STUB: GraphReady = {
  kind: 'graph',
  hash: '7a5c0001',
  packages: packagesOf(['app', 'lib', 'ui']),
  edges: EDGES,
  positions: null,
  folderPositions: null,
  tasks: TASKS
};

/** The same tasks under hash `7a5c0002`, with one more package, `docs`. */
export const TASK_MODE_NEW_HASH_STUB: GraphReady = {
  ...TASK_MODE_STATE_STUB,
  hash: '7a5c0002',
  packages: [...TASK_MODE_STATE_STUB.packages, packageOf('docs')]
};

/** The same hash as `TASK_MODE_STATE_STUB`, with `app#deploy`, a new dependent of `app#build`. */
export const TASK_MODE_MORE_TASKS_STUB: GraphReady = {
  ...TASK_MODE_STATE_STUB,
  tasks: [...TASKS, taskOf('app', 'deploy', ['app#build'])]
};

/** `TASK_MODE_NEW_HASH_STUB` again, same hash, with `docs` given its first task, `docs#build`. */
export const TASK_MODE_DOCS_TASK_STUB: GraphReady = {
  ...TASK_MODE_NEW_HASH_STUB,
  packages: [...TASK_MODE_STATE_STUB.packages, packageOf('docs', 'packages/docs', [], 1)],
  tasks: [...TASKS, taskOf('docs', 'build', [])]
};
