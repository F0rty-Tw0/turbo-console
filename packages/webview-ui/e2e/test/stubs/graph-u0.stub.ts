import type { GraphEdge, GraphPackage, GraphReady } from '../../../src/bridge/common/graph-state.type.ts';
import { packageOf } from '../utils/graph-package.spec.util.ts';

const edgeOf = (source: string, target: string): GraphEdge => {
  const edge: GraphEdge = { source, target };

  return edge;
};

/** The 19 packages of the U0 workspace (`~/.cache/tc-u0-fixture`), at their workspace paths. */
const U0_PACKAGES: GraphPackage[] = [
  packageOf('@company/admin', 'apps/admin'),
  packageOf('@company/api', 'apps/api'),
  packageOf('@company/api-client', 'packages/api-client'),
  packageOf('@company/config', 'packages/config'),
  packageOf('@company/data-cache', 'libs/data/cache'),
  packageOf('@company/data-queue', 'libs/data/queue'),
  packageOf('@company/db', 'packages/db'),
  packageOf('@company/docs', 'apps/docs'),
  packageOf('@company/eslint-config', 'tools/eslint-config'),
  packageOf('@company/ui', 'libs/ui/core'),
  packageOf('@company/ui-button', 'libs/ui/button'),
  packageOf('@company/ui-forms', 'libs/ui/forms'),
  packageOf('@company/ui-theme', 'libs/ui/theme'),
  packageOf('@company/utils', 'packages/utils'),
  packageOf('@company/web', 'apps/web'),
  packageOf('@company/worker', 'services/worker'),
  packageOf('codegen', 'tools/codegen'),
  packageOf('mailer', 'services/mailer'),
  packageOf('release-scripts', 'tools/release')
];

/** The 28 package edges of the U0 workspace, each source depending on its target. */
export const U0_EDGES_STUB: GraphEdge[] = [
  edgeOf('@company/admin', '@company/api-client'),
  edgeOf('@company/admin', '@company/ui'),
  edgeOf('@company/admin', '@company/ui-forms'),
  edgeOf('@company/api', '@company/config'),
  edgeOf('@company/api', '@company/db'),
  edgeOf('@company/api', '@company/utils'),
  edgeOf('@company/api-client', '@company/utils'),
  edgeOf('@company/data-cache', '@company/utils'),
  edgeOf('@company/data-queue', '@company/data-cache'),
  edgeOf('@company/db', '@company/config'),
  edgeOf('@company/db', '@company/utils'),
  edgeOf('@company/docs', '@company/ui'),
  edgeOf('@company/docs', '@company/utils'),
  edgeOf('@company/ui', '@company/ui-button'),
  edgeOf('@company/ui', '@company/ui-forms'),
  edgeOf('@company/ui', '@company/ui-theme'),
  edgeOf('@company/ui-button', '@company/ui-theme'),
  edgeOf('@company/ui-button', '@company/utils'),
  edgeOf('@company/ui-forms', '@company/ui-button'),
  edgeOf('@company/web', '@company/api-client'),
  edgeOf('@company/web', '@company/config'),
  edgeOf('@company/web', '@company/ui'),
  edgeOf('@company/web', '@company/utils'),
  edgeOf('@company/worker', '@company/data-queue'),
  edgeOf('@company/worker', '@company/db'),
  edgeOf('codegen', '@company/utils'),
  edgeOf('mailer', '@company/data-queue'),
  edgeOf('mailer', '@company/utils')
];

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
