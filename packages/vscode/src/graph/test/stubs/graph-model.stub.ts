import type { PackageEdge, PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { GraphEdge, GraphPackage, GraphReady, GraphTask, Position, Positions } from '@turbo-console/webview-ui';

import type { LoadedModel } from '../../../roots/common/root.type.ts';
import { LOADED_MODEL_STUB } from '../../../roots/test/stubs/root.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../../../tree/test/stubs/workspace-model.stub.ts';
import type { GraphLayoutCaches } from '../../common/graph-cache.type.ts';

const WEB_A_DEV: PackageEdge = { source: 'web', target: 'a', kind: 'dev' };
const WEB_A_PROD: PackageEdge = { source: 'web', target: 'a', kind: 'prod' };
const A_X_PROD: PackageEdge = { source: 'a', target: '@org/x', kind: 'prod' };
const WEB_X_PROD: PackageEdge = { source: 'web', target: '@org/x', kind: 'prod' };
const UNSORTED_EDGES: PackageEdge[] = [WEB_A_DEV, WEB_A_PROD, A_X_PROD, WEB_X_PROD];

const WEB_BUILD_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'web#build', dependencies: ['gone#build', 'a#build', '@org/x#build'] };
const WEB_LINT_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'web#lint', name: 'lint' };
const ATOM_FILE_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'f', name: 'f', kind: 'atom-file' };
const WEB_TASKS: TaskNode[] = [WEB_BUILD_TASK, WEB_LINT_TASK, ATOM_FILE_TASK];
const A_BUILD_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'a#build' };
const X_BUILD_TASK: TaskNode = { ...TASK_NODE_STUB, id: '@org/x#build' };

const TAGGED_WEB_NODE: PackageNode = {
  ...PACKAGE_NODE_STUB,
  name: 'web',
  path: 'apps/web',
  tags: ['ui', 'app', 'ui'],
  tasks: WEB_TASKS
};
const A_NODE: PackageNode = { ...PACKAGE_NODE_STUB, name: 'a', path: 'packages/a', tasks: [A_BUILD_TASK] };
const X_NODE: PackageNode = { ...PACKAGE_NODE_STUB, name: '@org/x', path: 'packages/libs/x', tasks: [X_BUILD_TASK] };
const GRAPH_NODES: PackageNode[] = [TAGGED_WEB_NODE, A_NODE, X_NODE];

export const GRAPH_MODEL_STUB: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages: GRAPH_NODES, edges: UNSORTED_EDGES };

export const GRAPH_LOADED_STUB: LoadedModel = { ...LOADED_MODEL_STUB, model: GRAPH_MODEL_STUB };

const A_X: GraphEdge = { source: 'a', target: '@org/x' };
const WEB_X: GraphEdge = { source: 'web', target: '@org/x' };
const WEB_A: GraphEdge = { source: 'web', target: 'a' };

export const GRAPH_HASH_STUB: string = '9bafdda7';

export const GRAPH_PACKAGES_STUB: string[] = ['@org/x', 'a', 'web'];

export const GRAPH_INFOS_STUB: GraphPackage[] = [
  { name: '@org/x', path: 'packages/libs/x', tags: [], taskCount: 1 },
  { name: 'a', path: 'packages/a', tags: [], taskCount: 1 },
  { name: 'web', path: 'apps/web', tags: ['app', 'ui'], taskCount: 2 }
];

export const GRAPH_TASKS_STUB: GraphTask[] = [
  { id: '@org/x#build', packageName: '@org/x', name: 'build', command: 'tsc', isRunnable: true, dependencies: [] },
  { id: 'a#build', packageName: 'a', name: 'build', command: 'tsc', isRunnable: true, dependencies: [] },
  {
    id: 'web#build',
    packageName: 'web',
    name: 'build',
    command: 'tsc',
    isRunnable: true,
    dependencies: ['@org/x#build', 'a#build']
  },
  { id: 'web#lint', packageName: 'web', name: 'lint', command: 'tsc', isRunnable: true, dependencies: [] }
];

export const GRAPH_STATE_STUB: GraphReady = {
  kind: 'graph',
  hash: GRAPH_HASH_STUB,
  packages: GRAPH_INFOS_STUB,
  edges: [A_X, WEB_X, WEB_A],
  positions: null,
  folderPositions: null,
  tasks: GRAPH_TASKS_STUB,
  atomGroups: []
};

const X_POINT: Position = { x: 0, y: 0 };
const A_POINT: Position = { x: 10, y: 20 };
const WEB_POINT: Position = { x: 30, y: 40 };

export const POSITIONS_STUB: Positions = { '@org/x': X_POINT, a: A_POINT, web: WEB_POINT };

const ZED_NODE: PackageNode = { ...PACKAGE_NODE_STUB, name: 'zed' };

const GROWN_MODEL_STUB: WorkspaceModel = { ...GRAPH_MODEL_STUB, packages: [...GRAPH_MODEL_STUB.packages, ZED_NODE] };

/** `GRAPH_LOADED_STUB` plus a package `zed`: a new model object with a new graph hash. */
export const GROWN_LOADED_STUB: LoadedModel = { ...GRAPH_LOADED_STUB, model: GROWN_MODEL_STUB };

const PROTO_NODE: PackageNode = { ...PACKAGE_NODE_STUB, name: '__proto__' };

const PROTO_MODEL_STUB: WorkspaceModel = { ...GRAPH_MODEL_STUB, packages: [...GRAPH_MODEL_STUB.packages, PROTO_NODE] };

/** `GRAPH_LOADED_STUB` plus a package named `__proto__`. */
export const PROTO_LOADED_STUB: LoadedModel = { ...GRAPH_LOADED_STUB, model: PROTO_MODEL_STUB };

/** Both layout caches missed: for a state built with no stored layout. */
export const NO_LAYOUT_CACHES_STUB: GraphLayoutCaches = { flat: null, folders: null };
