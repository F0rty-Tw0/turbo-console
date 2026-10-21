import type { PackageEdge, PackageNode, WorkspaceModel } from '@turbo-console/core';
import type { GraphEdge, GraphState, Position, Positions } from '@turbo-console/webview-ui';

import type { LoadedModel } from '../../../roots/common/root.type.ts';
import { LOADED_MODEL_STUB } from '../../../roots/test/stubs/root.stub.ts';
import { PACKAGE_NODE_STUB, WORKSPACE_MODEL_STUB } from '../../../tree/test/stubs/workspace-model.stub.ts';

const WEB_A_DEV: PackageEdge = { source: 'web', target: 'a', kind: 'dev' };
const WEB_A_PROD: PackageEdge = { source: 'web', target: 'a', kind: 'prod' };
const A_X_PROD: PackageEdge = { source: 'a', target: '@org/x', kind: 'prod' };
const WEB_X_PROD: PackageEdge = { source: 'web', target: '@org/x', kind: 'prod' };
const UNSORTED_EDGES: PackageEdge[] = [WEB_A_DEV, WEB_A_PROD, A_X_PROD, WEB_X_PROD];

export const GRAPH_MODEL_STUB: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, edges: UNSORTED_EDGES };

export const GRAPH_LOADED_STUB: LoadedModel = { ...LOADED_MODEL_STUB, model: GRAPH_MODEL_STUB };

const A_X: GraphEdge = { source: 'a', target: '@org/x' };
const WEB_X: GraphEdge = { source: 'web', target: '@org/x' };
const WEB_A: GraphEdge = { source: 'web', target: 'a' };

export const GRAPH_HASH_STUB: string = 'dc7e01eb';

export const GRAPH_PACKAGES_STUB: string[] = ['@org/x', 'a', 'web'];

export const GRAPH_STATE_STUB: GraphState = {
  kind: 'graph',
  hash: GRAPH_HASH_STUB,
  packages: GRAPH_PACKAGES_STUB,
  edges: [A_X, WEB_X, WEB_A],
  positions: null
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
