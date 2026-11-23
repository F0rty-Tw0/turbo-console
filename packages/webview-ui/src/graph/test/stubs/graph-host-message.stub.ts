import type { ImportSite } from '../../../bridge/common/graph-imports.type.ts';
import type { ModuleSite, ModuleSitesFound } from '../../../bridge/common/graph-module-sites.type.ts';
import type { ModuleCounts, ModuleLink, ModulesFound } from '../../../bridge/common/graph-modules.type.ts';
import type { GraphEdge } from '../../../bridge/common/graph-state.type.ts';

const FILE_TARGET: ModuleSite['target'] = { kind: 'file', path: 'src/b.ts' };

const STUB_TARGET: ModuleSite['target'] = { kind: 'stub', name: '@s/core' };

const MODULE_IMPORT_SITE: ModuleSite = {
  file: 'src/a.ts',
  line: 3,
  text: "import { b } from './b.ts';",
  kind: 'static',
  isType: false,
  target: FILE_TARGET
};

const MODULE_IMPORTED_BY_SITE: ModuleSite = {
  file: 'src/c.ts',
  line: 0,
  text: "export * from './a.ts';",
  kind: 'reexport',
  isType: false,
  target: STUB_TARGET
};

/** One valid module sites answer: one import of `src/b.ts` from `src/a.ts`, and one re-export site out of four counted. */
export const MODULE_SITES_FOUND_STUB: ModuleSitesFound = {
  kind: 'found',
  imports: [MODULE_IMPORT_SITE],
  importsTotal: 1,
  importedBy: [MODULE_IMPORTED_BY_SITE],
  importedByTotal: 4,
  limit: null
};

const MODULE_FILE_LINKS: ModuleLink[] = [[0, 1, 1, 0, 0]];

const MODULE_STUB_LINKS: ModuleLink[] = [[0, 0, 0, 1, 0]];

const MODULE_COUNTS: ModuleCounts = { unresolved: 0, external: 2, assets: 0, self: 0 };

/** One valid modules scan: two files (the second a test), one static file link 0 → 1, and one type link from file 0 to the stub `@s/b`. */
export const MODULES_FOUND_STUB: ModulesFound = {
  kind: 'found',
  files: ['src/a.ts', 'src/a.spec.ts'],
  tests: [1],
  stubs: ['@s/b'],
  fileLinks: MODULE_FILE_LINKS,
  stubLinks: MODULE_STUB_LINKS,
  counts: MODULE_COUNTS,
  scanned: 2,
  skipped: 0,
  limit: null,
  dropped: 0
};

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
  predictionShown: false,
  affectedShown: false
};
