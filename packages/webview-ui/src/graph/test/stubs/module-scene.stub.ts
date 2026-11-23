import { NODE_SIZE_STUB } from './node-size.stub.ts';
import type { ModuleCounts, ModulesFound } from '../../../bridge/common/graph-modules.type.ts';
import type { ModuleMeasures, ModuleShown } from '../../common/module-scene.type.ts';
import type { NodeSize } from '../../common/node-size.type.ts';

const NO_COUNTS: ModuleCounts = { unresolved: 0, external: 0, assets: 0, self: 0 };

/** Six files under `src/`, `src/lib/` and `src/ui/` plus `index.ts`, one test (`src/a.spec.ts`) and stubs `@s/x`, `@s/y`. */
export const MODULES_FOUND_STUB: ModulesFound = {
  kind: 'found',
  files: ['index.ts', 'src/a.ts', 'src/a.spec.ts', 'src/lib/b.ts', 'src/lib/c.ts', 'src/ui/d.ts'],
  tests: [2],
  stubs: ['@s/x', '@s/y'],
  fileLinks: [
    [0, 1, 1, 0, 0], // index → a, static
    [1, 3, 1, 1, 0], // a → b, static + type
    [1, 4, 0, 0, 1], // a → c, lazy
    [2, 1, 1, 0, 0], // a.spec → a
    [3, 4, 0, 1, 0], // b → c, type
    [5, 3, 1, 0, 0] // d → b
  ],
  stubLinks: [
    [2, 1, 0, 1, 0], // a.spec → @s/y, type
    [3, 0, 1, 0, 0] // b → @s/x
  ],
  counts: NO_COUNTS,
  scanned: 6,
  skipped: 0,
  limit: null,
  dropped: 0
};

export const ALL_SHOWN_STUB: ModuleShown = { types: true, tests: true, lazies: true };

/** Every card `NODE_SIZE_STUB`, every box title 40 px wide. */
export const MODULE_MEASURES_STUB: ModuleMeasures = {
  sizeOf: (): NodeSize => NODE_SIZE_STUB,
  titleWidthOf: (): number => 40
};
