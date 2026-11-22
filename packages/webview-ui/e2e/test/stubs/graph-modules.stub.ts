import type { ModuleCounts, ModuleLink, ModulesFound, ModulesResult } from '../../../src/bridge/common/graph-modules.type.ts';

const APP_COUNTS: ModuleCounts = { unresolved: 2, external: 3, assets: 1, self: 0 };

/**
 * `app`'s modules: `index.ts` at the root, three files in `src/views` (one a test) and two in `src/model/util`, one stub `lib`.
 * Under D9 the root opens, and so does `src`, its only child folder, which holds no file directly; `views` and `model`,
 * two siblings, stay collapsed. The status reads 6 files, 6 imports, 2 unresolved.
 */
export const MODULES_APP_STUB: ModulesFound = {
  kind: 'found',
  files: [
    'index.ts',
    'src/views/main.ts',
    'src/views/main.spec.ts',
    'src/views/panel.ts',
    'src/model/util/math.ts',
    'src/model/util/text.ts'
  ],
  tests: [2],
  stubs: ['lib'],
  fileLinks: [
    [0, 1, 1, 0, 0],
    [1, 3, 1, 0, 0],
    [1, 4, 0, 1, 0],
    [2, 1, 1, 0, 0],
    [3, 5, 0, 0, 1]
  ],
  stubLinks: [[3, 0, 1, 0, 0]],
  counts: APP_COUNTS,
  scanned: 6,
  skipped: 0,
  limit: null,
  dropped: 0
};

export const MODULES_FAILED_STUB: ModulesResult = { kind: 'failed' };

/** A dense `app` shaped like this page's own sources: index, src/main and five src folders, graph's seven layer folders below it. */
const DENSE_FILES = [
  'index.ts',
  'src/main.ts',
  'src/bridge/host.ts',
  'src/bridge/messages.ts',
  'src/details/panel.ts',
  'src/details/rows.ts',
  'src/styles/theme.ts',
  'src/graph/graph.ts',
  'src/graph/common/a.const.ts',
  'src/graph/common/b.type.ts',
  'src/graph/common/c.type.ts',
  'src/graph/data-access/view.ts',
  'src/graph/data-access/style.ts',
  'src/graph/data-access/runner.ts',
  'src/graph/domain-logic/layout.ts',
  'src/graph/domain-logic/mode.ts',
  'src/graph/domain-logic/wiring.ts',
  'src/graph/feature/controller.ts',
  'src/graph/feature/page.ts',
  'src/graph/ui/toolbar.ts',
  'src/graph/ui/controls.ts',
  'src/graph/utils/scene.util.ts',
  'src/graph/utils/routes.util.ts',
  'src/graph/utils/text.util.ts',
  'src/graph/test/stubs.ts',
  'src/graph/test/mocks.ts',
  'src/shared/ui.ts',
  'src/shared/text.ts'
];

/** feature → domain-logic → data-access → utils → common, with links that skip layers, plus links out to src's folders. */
const DENSE_FILE_LINKS: ModuleLink[] = [
  [0, 1, 1, 0, 0],
  [0, 4, 1, 0, 0],
  [1, 7, 1, 0, 0],
  [1, 2, 1, 0, 0],
  [4, 2, 1, 0, 0],
  [4, 3, 0, 1, 0],
  [4, 26, 1, 0, 0],
  [5, 6, 1, 0, 0],
  [7, 17, 1, 0, 0],
  [7, 18, 1, 0, 0],
  [9, 3, 0, 1, 0],
  [11, 21, 1, 0, 0],
  [11, 8, 1, 0, 0],
  [11, 6, 1, 0, 0],
  [12, 23, 1, 0, 0],
  [12, 27, 1, 0, 0],
  [13, 10, 0, 1, 0],
  [13, 3, 1, 0, 0],
  [14, 11, 1, 0, 0],
  [14, 8, 0, 1, 0],
  [14, 21, 1, 0, 0],
  [15, 12, 1, 0, 0],
  [15, 9, 0, 1, 0],
  [16, 13, 1, 0, 0],
  [16, 22, 1, 0, 0],
  [16, 8, 0, 1, 0],
  [17, 14, 1, 0, 0],
  [17, 15, 1, 0, 0],
  [17, 19, 1, 0, 0],
  [17, 8, 1, 0, 0],
  [17, 21, 1, 0, 0],
  [18, 16, 1, 0, 0],
  [18, 20, 1, 0, 0],
  [18, 9, 0, 1, 0],
  [18, 2, 1, 0, 0],
  [19, 8, 1, 0, 0],
  [19, 6, 1, 0, 0],
  [19, 26, 1, 0, 0],
  [20, 23, 1, 0, 0],
  [20, 26, 1, 0, 0],
  [21, 8, 1, 0, 0],
  [22, 9, 0, 1, 0],
  [23, 10, 0, 1, 0],
  [23, 27, 1, 0, 0],
  [24, 8, 0, 1, 0],
  [24, 21, 1, 0, 0],
  [25, 11, 1, 0, 0],
  [25, 14, 1, 0, 0],
  [26, 27, 1, 0, 0]
];

/** Under D9 the root and src open; expanding src/graph then draws its seven layer folders as cards in one box. */
export const MODULES_DENSE_STUB: ModulesFound = {
  ...MODULES_APP_STUB,
  files: DENSE_FILES,
  tests: [],
  fileLinks: DENSE_FILE_LINKS,
  stubLinks: [[2, 0, 1, 0, 0]],
  scanned: DENSE_FILES.length
};

/** A scan that found no source file. */
export const MODULES_EMPTY_STUB: ModulesFound = {
  ...MODULES_APP_STUB,
  files: [],
  tests: [],
  stubs: [],
  fileLinks: [],
  stubLinks: [],
  scanned: 0
};
