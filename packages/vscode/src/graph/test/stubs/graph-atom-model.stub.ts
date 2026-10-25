import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';

import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../../../tree/test/stubs/workspace-model.stub.ts';

const PLAIN_ATOM: NonNullable<TaskNode['atom']> = { group: 'e2e-ci', isLive: false };

const LIVE_ATOM: NonNullable<TaskNode['atom']> = { group: 'e2e-ci', isLive: true };

const FILE_A_ID = '@fx/e2e#e2e-ci--tests/a.spec.ts';

const AGGREGATE_ID = '@fx/e2e#e2e-ci--all';

export const APP_BUILD_TASK_STUB: TaskNode = { ...TASK_NODE_STUB, id: '@fx/app#build' };

export const ATOM_UMBRELLA_TASK_STUB: TaskNode = {
  ...TASK_NODE_STUB,
  id: '@fx/e2e#e2e-ci',
  name: 'e2e-ci',
  kind: 'atom-umbrella',
  atom: PLAIN_ATOM,
  dependencies: [AGGREGATE_ID]
};

export const ATOM_FILE_A_TASK_STUB: TaskNode = {
  ...TASK_NODE_STUB,
  id: FILE_A_ID,
  name: 'e2e-ci--tests/a.spec.ts',
  kind: 'atom-file',
  atom: PLAIN_ATOM,
  dependencies: [APP_BUILD_TASK_STUB.id]
};

export const ATOM_FILE_B_TASK_STUB: TaskNode = {
  ...TASK_NODE_STUB,
  id: '@fx/e2e#e2e-ci--tests/b fails.spec.ts',
  name: 'e2e-ci--tests/b fails.spec.ts',
  kind: 'atom-file',
  atom: LIVE_ATOM,
  dependencies: [APP_BUILD_TASK_STUB.id, FILE_A_ID]
};

export const ATOM_AGGREGATE_TASK_STUB: TaskNode = {
  ...TASK_NODE_STUB,
  id: AGGREGATE_ID,
  name: 'e2e-ci--all',
  kind: 'atom-aggregate',
  atom: PLAIN_ATOM,
  dependencies: [ATOM_FILE_A_TASK_STUB.id, ATOM_FILE_B_TASK_STUB.id]
};

const ROOT_ALL_TASK: TaskNode = {
  ...TASK_NODE_STUB,
  id: '//#all-e2e',
  name: 'all-e2e',
  dependencies: [AGGREGATE_ID]
};

export const ATOM_E2E_PACKAGE_STUB: PackageNode = {
  ...PACKAGE_NODE_STUB,
  name: '@fx/e2e',
  path: 'packages/e2e',
  tasks: [ATOM_UMBRELLA_TASK_STUB, ATOM_AGGREGATE_TASK_STUB, ATOM_FILE_A_TASK_STUB, ATOM_FILE_B_TASK_STUB]
};

const APP_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, name: '@fx/app', path: 'packages/app', tasks: [APP_BUILD_TASK_STUB] };

const ROOT_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, name: '//', path: '.', tasks: [ROOT_ALL_TASK] };

/** One Atomizer group in `@fx/e2e` (umbrella, hidden aggregate, two files), a build it depends on, and a root task that depends on the aggregate. */
export const GRAPH_ATOM_MODEL_STUB: WorkspaceModel = {
  ...WORKSPACE_MODEL_STUB,
  packages: [ATOM_E2E_PACKAGE_STUB, APP_PACKAGE, ROOT_PACKAGE]
};
