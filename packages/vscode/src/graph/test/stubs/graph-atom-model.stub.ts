import type { AtomFile, AtomGroup, PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';

import type { AtomLookup, AtomView } from '../../../tree/common/atom-view.type.ts';
import { ATOM_RESULT_STUB } from '../../../tree/test/stubs/atom-load.stub.ts';
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

/** The core group of `GRAPH_ATOM_MODEL_STUB`: the umbrella and its two files in spec path order. */
const GRAPH_ATOM_FILES: AtomFile[] = [
  { task: ATOM_FILE_A_TASK_STUB, specPath: 'tests/a.spec.ts', isLive: false },
  { task: ATOM_FILE_B_TASK_STUB, specPath: 'tests/b fails.spec.ts', isLive: true }
];

export const GRAPH_ATOM_GROUP_STUB: AtomGroup = {
  packageName: ATOM_E2E_PACKAGE_STUB.name,
  umbrella: ATOM_UMBRELLA_TASK_STUB,
  files: GRAPH_ATOM_FILES
};

/** The group loaded: file A is a dry-run HIT and passed, file B is unknown. */
export const GRAPH_ATOM_VIEW_STUB: AtomView = {
  groups: [GRAPH_ATOM_GROUP_STUB],
  dryRun: new Map([[ATOM_FILE_A_TASK_STUB.id, 'HIT']]),
  results: new Map([[ATOM_FILE_A_TASK_STUB.id, ATOM_RESULT_STUB]])
};

/** The group known from the model alone: no load has settled. */
export const GRAPH_ATOM_UNLOADED_VIEW_STUB: AtomView = { groups: [GRAPH_ATOM_GROUP_STUB], dryRun: null, results: null };

export const GRAPH_ATOM_LOOKUP_STUB: AtomLookup = () => GRAPH_ATOM_VIEW_STUB;
