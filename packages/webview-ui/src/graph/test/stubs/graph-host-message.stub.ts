import type { ImportSite } from '../../../bridge/common/graph-imports.type.ts';
import type { GraphEdge } from '../../../bridge/common/graph-state.type.ts';

/** One valid import site, a static `import 'core';` on line 3 of `src/a.ts`, as a host sends it. */
export const IMPORT_SITE_STUB: ImportSite = {
  file: 'src/a.ts',
  line: 3,
  specifier: 'core',
  text: "import 'core';",
  kind: 'static',
  isType: false,
  via: 'name'
};

/** Two valid package rows, `app` and `core`, as a host sends them. */
export const HOST_PACKAGES_STUB: Record<string, unknown>[] = [
  { name: 'app', bareName: 'app', path: 'apps/app', tags: ['ui'], taskCount: 3 },
  { name: 'core', bareName: 'core', path: 'packages/core', tags: [], taskCount: 0 }
];

/** One valid edge, `app` to `core`. */
export const HOST_EDGES_STUB: GraphEdge[] = [{ source: 'app', target: 'core' }];

/** One valid task row, `app#build`, which needs `core#build`. */
export const HOST_TASK_STUB: Record<string, unknown> = {
  id: 'app#build',
  packageName: 'app',
  name: 'build',
  command: 'tsc',
  isRunnable: true,
  isTurboTask: true,
  dependencies: ['core#build']
};

/** A valid graph state message body with no layout, no task and no atom group. */
export const HOST_GRAPH_STUB: Record<string, unknown> = {
  kind: 'graph',
  hash: 'h',
  packages: HOST_PACKAGES_STUB,
  edges: HOST_EDGES_STUB,
  positions: null,
  routes: null,
  folderRoutes: null,
  folderPositions: null,
  tasks: [],
  atomGroups: [],
  singlePackage: false,
  rootLabel: null,
  scopeShown: true,
  scriptsShown: true,
  predictionShown: false
};
