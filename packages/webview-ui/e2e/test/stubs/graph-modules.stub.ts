import type { ModuleCounts, ModulesFound, ModulesResult } from '../../../src/bridge/common/graph-modules.type.ts';

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
