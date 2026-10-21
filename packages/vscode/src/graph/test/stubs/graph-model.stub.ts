import type { PackageEdge, WorkspaceModel } from '@turbo-console/core';
import type { GraphEdge, GraphState, Position, Positions } from '@turbo-console/webview-ui';

import type { LoadedModel } from '../../../roots/common/root.type.ts';
import { LOADED_MODEL_STUB } from '../../../roots/test/stubs/root.stub.ts';
import { WORKSPACE_MODEL_STUB } from '../../../tree/test/stubs/workspace-model.stub.ts';

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

export const GRAPH_STATE_STUB: GraphState = {
  kind: 'graph',
  hash: 'dc7e01eb',
  packages: ['@org/x', 'a', 'web'],
  edges: [A_X, WEB_X, WEB_A],
  positions: null
};

const X_POINT: Position = { x: 0, y: 0 };
const A_POINT: Position = { x: 10, y: 20 };
const WEB_POINT: Position = { x: 30, y: 40 };

export const POSITIONS_STUB: Positions = { '@org/x': X_POINT, a: A_POINT, web: WEB_POINT };
