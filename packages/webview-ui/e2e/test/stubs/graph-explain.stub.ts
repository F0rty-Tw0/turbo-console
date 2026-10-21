import type { EdgeExplainResult, ManifestContext, ManifestEntry } from '../../../src/bridge/common/graph-message.type.ts';
import type { ExcerptRow } from '../../../src/graph/common/details.type.ts';
import type { FoundExplainResult, OpenManifestMessage } from '../../common/graph.type.ts';

const UI_ENTRY_CONTEXT: ManifestContext = { before: '  "dependencies": {', after: '    "data":   "workspace:*",' };

/** Line 5 of the manifest: the host sends it 0-based, the editor shows line 6. */
export const UI_ENTRY_STUB: ManifestEntry = {
  field: 'dependencies',
  key: 'ui',
  spec: 'workspace:*',
  line: 5,
  context: UI_ENTRY_CONTEXT
};

const UI_DEV_CONTEXT: ManifestContext = { before: '  "devDependencies": {' };

/** The same dependency again under `devDependencies`, with no line after it. */
export const UI_DEV_ENTRY_STUB: ManifestEntry = {
  field: 'devDependencies',
  key: 'ui',
  spec: '^1.0.0',
  line: 9,
  context: UI_DEV_CONTEXT
};

export const UI_ENTRIES_STUB: ManifestEntry[] = [UI_ENTRY_STUB, UI_DEV_ENTRY_STUB];

/** Leading whitespace trimmed, inner spaces kept; the entry row is the middle one. */
export const UI_ENTRY_ROWS_STUB: ExcerptRow[] = [
  { number: 5, text: '"dependencies": {', isEntry: false },
  { number: 6, text: '"ui": "workspace:*"', isEntry: true },
  { number: 7, text: '"data":   "workspace:*",', isEntry: false }
];

export const UI_DEV_ROWS_STUB: ExcerptRow[] = [
  { number: 9, text: '"devDependencies": {', isEntry: false },
  { number: 10, text: '"ui": "^1.0.0"', isEntry: true }
];

export const FOUND_UI_STUB: FoundExplainResult = { kind: 'found', file: 'apps/web/package.json', entries: UI_ENTRIES_STUB };

const CHANGED_ENTRY: ManifestEntry = { ...UI_ENTRY_STUB, spec: '^2.0.0' };

/** `FOUND_UI_STUB` with the first entry's spec changed. */
export const FOUND_UI_CHANGED_STUB: FoundExplainResult = { ...FOUND_UI_STUB, entries: [CHANGED_ENTRY, UI_DEV_ENTRY_STUB] };

const NO_CONTEXT: ManifestContext = {};

const DATA_ENTRY: ManifestEntry = { field: 'dependencies', key: 'data', spec: 'workspace:*', line: 6, context: NO_CONTEXT };

/** One entry with neither a line before nor a line after it. */
export const FOUND_DATA_STUB: FoundExplainResult = { kind: 'found', file: 'apps/web/package.json', entries: [DATA_ENTRY] };

export const DATA_ROWS_STUB: ExcerptRow[] = [{ number: 7, text: '"data": "workspace:*"', isEntry: true }];

export const MISSING_STUB: EdgeExplainResult = { kind: 'missing', file: 'apps/web/package.json' };

export const UNREADABLE_STUB: EdgeExplainResult = { kind: 'unreadable', file: 'apps/web/package.json' };

export const ROOT_UNREADABLE_STUB: EdgeExplainResult = { kind: 'unreadable', file: 'package.json' };

const PROTO_CONTEXT: ManifestContext = { before: '  "dependencies": {' };

const PROTO_ENTRY: ManifestEntry = { field: 'dependencies', key: 'constructor', spec: 'workspace:*', line: 4, context: PROTO_CONTEXT };

export const FOUND_PROTO_STUB: FoundExplainResult = {
  kind: 'found',
  file: 'packages/__proto__/package.json',
  entries: [PROTO_ENTRY]
};

/** The rows of the first entry of `FOUND_UI_CHANGED_STUB`: only the entry's spec differs from `UI_ENTRY_ROWS_STUB`. */
export const UI_CHANGED_ROWS_STUB: ExcerptRow[] = [
  { number: 5, text: '"dependencies": {', isEntry: false },
  { number: 6, text: '"ui": "^2.0.0"', isEntry: true },
  { number: 7, text: '"data":   "workspace:*",', isEntry: false }
];

const OPEN_UI_LINE_5: OpenManifestMessage = { type: 'openManifest', packageName: 'web', line: 5 };

const OPEN_UI_LINE_9: OpenManifestMessage = { type: 'openManifest', packageName: 'web', line: 9 };

/** The `openManifest` messages "Open at line" posts for `FOUND_UI_STUB`, one per entry line (0-based). */
export const OPEN_UI_MANIFEST_STUB: OpenManifestMessage[] = [OPEN_UI_LINE_5, OPEN_UI_LINE_9];

/** The one message the first entry's "Open at line 6" posts. */
export const OPEN_UI_FIRST_STUB: OpenManifestMessage[] = [OPEN_UI_LINE_5];

/** The one message "Open package.json" posts for a missing entry: the top of the manifest. */
export const OPEN_WEB_TOP_STUB: OpenManifestMessage[] = [{ type: 'openManifest', packageName: 'web', line: 0 }];

export const OPEN_PROTO_MANIFEST_STUB: OpenManifestMessage[] = [{ type: 'openManifest', packageName: '__proto__', line: 4 }];
