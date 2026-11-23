import type { ModuleGroupFacts, ModuleRowFacts } from './graph-module-panels.type.ts';

/** The module Controls aside's id (spec §6.1). */
export const MODULE_CONTROLS_ID = 'graph-module-controls';

/** The module Details aside's id (spec §6.1). */
export const MODULE_DETAILS_ID = 'graph-module-details';

/** The module Details hint while nothing is selected (spec §6.3). */
export const MODULE_EMPTY_TEXT = 'Select a file, package or link to see its imports.';

export const IMPORTS_HEADING = 'Imports';

export const IMPORTED_BY_HEADING = 'Imported by';

/** The Controls Focus line while no focus is set (spec §6.2). */
export const NO_FOCUS_TEXT = 'None';

/** Focus on `index.ts` at depth 1: it and `main.ts`; the test file is hidden, `src/model` holds nothing walked and is dropped. */
export const FOCUS_1_IDS = ['dir:', 'dir:src', 'dir:src/views', 'file:index.ts', 'file:src/views/main.ts'];

export const FOCUS_1_EDGES = ['file:index.ts→file:src/views/main.ts solid'];

/** Depth 2 adds `main.ts`' own imports, `panel.ts` and the type-only `math.ts`, whose folders are held open. */
export const FOCUS_2_IDS = [
  'dir:',
  'dir:src',
  'dir:src/model',
  'dir:src/model/util',
  'dir:src/views',
  'file:index.ts',
  'file:src/model/util/math.ts',
  'file:src/views/main.ts',
  'file:src/views/panel.ts'
];

/** `panel.ts`' links to `text.ts` and `lib` end outside the walk, so they are not drawn. */
export const FOCUS_2_EDGES = [
  'file:index.ts→file:src/views/main.ts solid',
  'file:src/views/main.ts→file:src/model/util/math.ts dashed',
  'file:src/views/main.ts→file:src/views/panel.ts solid'
];

const INDEX_ROW: ModuleRowFacts = { file: 'index.ts', number: 1, text: "import { main } from './src/views/main.ts';", tags: [] };

const MAIN_PANEL_ROW: ModuleRowFacts = { file: 'src/views/main.ts', number: 1, text: "import { panel } from './panel.ts';", tags: [] };

const MAIN_MATH_ROW: ModuleRowFacts = {
  file: 'src/views/main.ts',
  number: 2,
  text: "import type { Vec } from '../model/util/math.ts';",
  tags: ['type']
};

const SPEC_ROW: ModuleRowFacts = { file: 'src/views/main.spec.ts', number: 3, text: "import { main } from './main.ts';", tags: [] };

const PANEL_TEXT_ROW: ModuleRowFacts = {
  file: 'src/views/panel.ts',
  number: 4,
  text: "const text = await import('../model/util/text.ts');",
  tags: ['dynamic']
};

const PANEL_LIB_ROW: ModuleRowFacts = { file: 'src/views/panel.ts', number: 1, text: "import { lib } from 'lib';", tags: [] };

/** `main.ts`' Imports, grouped by target label in label order. */
export const MAIN_IMPORTS: ModuleGroupFacts[] = [
  { label: 'src/model/util/math.ts', rows: [MAIN_MATH_ROW] },
  { label: 'src/views/panel.ts', rows: [MAIN_PANEL_ROW] }
];

/** `main.ts`' Imported by, grouped by importing file; the hidden test file's line still lists. */
export const MAIN_IMPORTED_BY: ModuleGroupFacts[] = [
  { label: 'index.ts', rows: [INDEX_ROW] },
  { label: 'src/views/main.spec.ts', rows: [SPEC_ROW] }
];

/** The `views → model` link's Imports, grouped by importing file. */
export const LINK_IMPORTS: ModuleGroupFacts[] = [
  { label: 'src/views/main.ts', rows: [MAIN_MATH_ROW] },
  { label: 'src/views/panel.ts', rows: [PANEL_TEXT_ROW] }
];

export const LIB_IMPORTED_BY: ModuleGroupFacts[] = [{ label: 'src/views/panel.ts', rows: [PANEL_LIB_ROW] }];

export const INDEX_IMPORTS: ModuleGroupFacts[] = [{ label: 'src/views/main.ts', rows: [INDEX_ROW] }];
