import type { AtomFile, AtomGroup, PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';

import { TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from './workspace-model.stub.ts';
import type { AtomView } from '../../common/atom-view.type.ts';

const PLAIN_ATOM: NonNullable<TaskNode['atom']> = { group: 'e2e-ci', isLive: false };

const LIVE_ATOM: NonNullable<TaskNode['atom']> = { group: 'e2e-ci', isLive: true };

const BUILD_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'e2e#build', name: 'build' };

const UMBRELLA_TASK: TaskNode = {
  ...TASK_NODE_STUB,
  id: 'e2e#e2e-ci',
  name: 'e2e-ci',
  kind: 'atom-umbrella',
  atom: PLAIN_ATOM
};

const AGGREGATE_TASK: TaskNode = {
  ...TASK_NODE_STUB,
  id: 'e2e#e2e-ci--all',
  name: 'e2e-ci--all',
  kind: 'atom-aggregate',
  atom: PLAIN_ATOM
};

const A_TASK: TaskNode = {
  ...TASK_NODE_STUB,
  id: 'e2e#e2e-ci--tests/a.spec.ts',
  name: 'e2e-ci--tests/a.spec.ts',
  kind: 'atom-file',
  atom: PLAIN_ATOM
};

const SPACED_TASK: TaskNode = {
  ...TASK_NODE_STUB,
  id: 'e2e#e2e-ci--tests/b fails.spec.ts',
  name: 'e2e-ci--tests/b fails.spec.ts',
  kind: 'atom-file',
  atom: PLAIN_ATOM
};

const LIVE_TASK: TaskNode = {
  ...TASK_NODE_STUB,
  id: 'e2e#e2e-ci--tests/live.spec.ts',
  name: 'e2e-ci--tests/live.spec.ts',
  kind: 'atom-file',
  atom: LIVE_ATOM
};

export const A_FILE_STUB: AtomFile = { task: A_TASK, specPath: 'tests/a.spec.ts', isLive: false };

export const SPACED_FILE_STUB: AtomFile = { task: SPACED_TASK, specPath: 'tests/b fails.spec.ts', isLive: false };

export const LIVE_FILE_STUB: AtomFile = { task: LIVE_TASK, specPath: 'tests/live.spec.ts', isLive: true };

/** Package `e2e`: a plain task, the umbrella and aggregate of group `e2e-ci`, then its three file tasks. */
export const E2E_PACKAGE_STUB: PackageNode = {
  name: 'e2e',
  path: 'packages/e2e',
  label: null,
  tags: [],
  tasks: [BUILD_TASK, UMBRELLA_TASK, AGGREGATE_TASK, A_TASK, SPACED_TASK, LIVE_TASK]
};

export const ATOM_GROUP_STUB: AtomGroup = {
  packageName: 'e2e',
  umbrella: UMBRELLA_TASK,
  files: [A_FILE_STUB, SPACED_FILE_STUB, LIVE_FILE_STUB]
};

export const ATOM_VIEW_STUB: AtomView = { groups: [ATOM_GROUP_STUB], dryRun: null, results: null };

export const ATOM_MODEL_STUB: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages: [E2E_PACKAGE_STUB] };
