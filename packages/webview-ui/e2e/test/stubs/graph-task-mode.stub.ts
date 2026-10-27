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
  singlePackage: false,
  rootLabel: null,
  hash: '7a5c0001',
  packages: packagesOf(['app', 'lib', 'ui']),
  edges: EDGES,
  positions: null,
  folderPositions: null,
  tasks: TASKS,
  atomGroups: []
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

const LONG_NAMES_EDGES: GraphEdge[] = [{ source: '@company/web', target: '@company/api-client' }];

const LONG_NAMES_TASKS: GraphTask[] = [
  taskOf('@company/api-client', 'build', []),
  taskOf('@company/web', 'build', ['@company/api-client#build'])
];

/** `@company/web#build` needs `@company/api-client#build`: package names wider than their one task, hash `7a5c0010`. */
export const TASK_LONG_NAMES_STUB: GraphReady = {
  ...TASK_MODE_STATE_STUB,
  hash: '7a5c0010',
  packages: packagesOf(['@company/api-client', '@company/web']),
  edges: LONG_NAMES_EDGES,
  tasks: LONG_NAMES_TASKS
};
