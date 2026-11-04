import type { GraphEdge, GraphReady } from '../../../src/bridge/common/graph-state.type.ts';
import { U0_EDGES_STUB as U0_EDGES, U0_PACKAGES_STUB as U0_PACKAGES } from '../../../src/graph/test/stubs/u0-workspace.stub.ts';

/** The 28 package edges of the U0 workspace, each source depending on its target (the vitest U0 stub's list). */
export const U0_EDGES_STUB: GraphEdge[] = U0_EDGES;

/** The packages the `libs/ui` folder box holds. */
export const U0_LIBS_UI_STUB: string[] = ['@company/ui', '@company/ui-button', '@company/ui-forms', '@company/ui-theme'];

/** The U0 workspace's graph, no layout cached, as the host sends it: 19 packages, 28 edges, no tags. */
export const U0_STATE_STUB: GraphReady = {
  kind: 'graph',
  singlePackage: false,
  rootLabel: null,
  scopeShown: true,
  scriptsShown: true,
  hash: 'c0a6b000',
  packages: U0_PACKAGES,
  edges: U0_EDGES_STUB,
  positions: null,
  routes: null,
  folderRoutes: null,
  folderPositions: null,
  tasks: [],
  atomGroups: []
};
