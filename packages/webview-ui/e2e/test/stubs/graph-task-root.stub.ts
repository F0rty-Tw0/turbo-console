import { TASK_MODE_STATE_STUB } from './graph-task-mode.stub.ts';
import type { GraphPackage, GraphReady, GraphTask } from '../../../src/bridge/common/graph-state.type.ts';
import { packageOf } from '../utils/graph-package.spec.util.ts';

const ROOT_PACKAGE: GraphPackage = packageOf('//', '.', [], 1);

const ROOT_LINT: GraphTask = {
  id: '//#lint',
  packageName: '//',
  name: 'lint',
  command: 'eslint .',
  isRunnable: true,
  dependencies: []
};

/** `TASK_MODE_STATE_STUB` under hash `7a5c0020` with the root package `//` and its one task, `//#lint`. */
export const TASK_ROOT_STATE_STUB: GraphReady = {
  ...TASK_MODE_STATE_STUB,
  hash: '7a5c0020',
  packages: [...TASK_MODE_STATE_STUB.packages, ROOT_PACKAGE],
  tasks: [...TASK_MODE_STATE_STUB.tasks, ROOT_LINT]
};
