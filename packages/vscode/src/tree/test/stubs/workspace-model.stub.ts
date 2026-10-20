import type { PackageManager, PackageManagerSource, PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';

import type { RowScope } from '../../common/tree-row.type.ts';

export const TASK_NODE_STUB: TaskNode = {
  id: 'build',
  name: 'build',
  command: 'tsc',
  description: null,
  tags: [],
  dependencies: [],
  kind: 'task',
  atom: null,
  isTurboTask: true,
  persistent: false
};

const WEB_PACKAGE_STUB: PackageNode = { name: 'web', path: 'apps/web', label: null, tags: [], tasks: [TASK_NODE_STUB] };

export const PACKAGE_NODE_STUB: PackageNode = { name: 'a', path: 'packages/a', label: null, tags: [], tasks: [TASK_NODE_STUB] };

const X_PACKAGE_STUB: PackageNode = { name: '@org/x', path: 'packages/libs/x', label: null, tags: [], tasks: [TASK_NODE_STUB] };

const FIELD_SOURCE_STUB: PackageManagerSource = { kind: 'field' };

export const PACKAGE_MANAGER_STUB: PackageManager = { name: 'pnpm', source: FIELD_SOURCE_STUB };

export const WORKSPACE_MODEL_STUB: WorkspaceModel = {
  root: '/ws',
  turboVersion: '2.11.7',
  packageManager: PACKAGE_MANAGER_STUB,
  affectedMode: 'package',
  singlePackage: false,
  packages: [WEB_PACKAGE_STUB, PACKAGE_NODE_STUB, X_PACKAGE_STUB],
  edges: [],
  warnings: []
};

/** The scope of folder `/ws` over `WORKSPACE_MODEL_STUB`. */
export const ROW_SCOPE_STUB: RowScope = { root: '/ws', packageManager: PACKAGE_MANAGER_STUB, singlePackage: false };
