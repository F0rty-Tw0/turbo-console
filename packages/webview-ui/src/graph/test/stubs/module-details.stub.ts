import type { ImportGroupModel, ImportRowModel, ImportsViewModel } from '../../common/details-imports.type.ts';
import type { ModuleDetailsView } from '../../common/module-details.type.ts';

/** `src/b.ts` line 4 (0-based), as `src/a.ts` imports it. */
export const B_LINE_4_ROW_STUB: ImportRowModel = {
  key: 'src/b.ts:4',
  file: 'src/b.ts',
  line: 4,
  number: '5',
  text: "import { b } from './b';",
  tags: [],
  label: 'src/b.ts line 5'
};

const B_LINE_9_ROW: ImportRowModel = { ...B_LINE_4_ROW_STUB, key: 'src/b.ts:9', line: 9, number: '10', label: 'src/b.ts line 10' };

const B_GROUP: ImportGroupModel = { file: 'src/b.ts', rows: [B_LINE_4_ROW_STUB, B_LINE_9_ROW] };

const C_LINE_2_ROW: ImportRowModel = {
  key: 'src/c.ts:2',
  file: 'src/c.ts',
  line: 2,
  number: '3',
  text: "import { a } from './a';",
  tags: [],
  label: 'src/c.ts line 3'
};

const C_GROUP: ImportGroupModel = { file: 'src/c.ts', rows: [C_LINE_2_ROW] };

/** Two rows of `src/b.ts` in one group, nothing folded, not scanning. */
export const IMPORTS_MODEL_STUB: ImportsViewModel = {
  heading: 'Imports (2)',
  scanLabel: 'Scan again: Imports',
  isScanning: false,
  status: null,
  statusText: '',
  lines: [],
  groups: [B_GROUP],
  more: null,
  notes: []
};

/** One row of `src/c.ts`, with Show more for the rows past the fold. */
export const IMPORTED_BY_MODEL_STUB: ImportsViewModel = {
  ...IMPORTS_MODEL_STUB,
  heading: 'Imported by (3)',
  scanLabel: 'Scan again: Imported by',
  groups: [C_GROUP],
  more: 'Show 2 more'
};

/** `src/a.ts`: it imports two lines of `src/b.ts`, and `src/c.ts` imports it. */
export const FILE_A_VIEW_STUB: ModuleDetailsView = {
  kind: 'file',
  id: 'file:src/a.ts',
  path: 'src/a.ts',
  imports: IMPORTS_MODEL_STUB,
  importedBy: IMPORTED_BY_MODEL_STUB
};

/** The stub `@s/x`, which `src/c.ts` imports. */
export const STUB_X_VIEW_STUB: ModuleDetailsView = { kind: 'stub', id: 'pkg:@s/x', name: '@s/x', importedBy: IMPORTED_BY_MODEL_STUB };

/** The link `src/a.ts → src/b.ts`, with its two lines. */
export const LINK_A_B_VIEW_STUB: ModuleDetailsView = { kind: 'link', title: 'src/a.ts → src/b.ts', imports: IMPORTS_MODEL_STUB };
