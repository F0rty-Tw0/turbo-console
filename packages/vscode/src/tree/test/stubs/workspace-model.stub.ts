import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';

export const TASK_NODE_STUB: TaskNode = {
  id: 'build',
  name: 'build',
  command: 'tsc',
  description: null,
  tags: [],
  dependencies: [],
  kind: 'task',
  atom: null
};

const WEB_PACKAGE_STUB: PackageNode = { name: 'web', path: 'apps/web', tags: [], tasks: [TASK_NODE_STUB] };

export const PACKAGE_NODE_STUB: PackageNode = { name: 'a', path: 'packages/a', tags: [], tasks: [TASK_NODE_STUB] };

const X_PACKAGE_STUB: PackageNode = { name: '@org/x', path: 'packages/libs/x', tags: [], tasks: [TASK_NODE_STUB] };

export const WORKSPACE_MODEL_STUB: WorkspaceModel = {
  root: '/ws',
  turboVersion: '2.11.7',
  affectedMode: 'package',
  packages: [WEB_PACKAGE_STUB, PACKAGE_NODE_STUB, X_PACKAGE_STUB],
  edges: [],
  warnings: []
};
