import type { EdgeImportsResult, ImportLimit, ImportSite } from '../../../src/bridge/common/graph-imports.type.ts';
import type { FoundImportsResult } from '../../common/graph-imports.type.ts';

const PLAIN_SITE: ImportSite = {
  file: 'src/a.ts',
  line: 3,
  specifier: 'ui',
  text: "import { Button } from 'ui';",
  kind: 'static',
  isType: false,
  via: 'name'
};

const SECOND_SITE: ImportSite = { ...PLAIN_SITE, line: 8, text: "import { Card } from 'ui';" };

const TYPE_DYNAMIC_SITE: ImportSite = {
  file: 'src/b.ts',
  line: 0,
  specifier: 'ui',
  text: "type Ui = import('ui').Ui;",
  kind: 'dynamic',
  isType: true,
  via: 'name'
};

/** Three sites: two in `src/a.ts` (lines 4 and 9, 1-based) and one in `src/b.ts` that is a `type` and `dynamic` at once. */
export const FOUND_WEB_UI_STUB: FoundImportsResult = {
  kind: 'found',
  scanned: 12,
  skipped: 0,
  total: 3,
  sites: [PLAIN_SITE, SECOND_SITE, TYPE_DYNAMIC_SITE],
  limit: null
};

export const NONE_STUB: EdgeImportsResult = { kind: 'none', scanned: 3, skipped: 0, limit: null };

export const NONE_SKIPPED_STUB: EdgeImportsResult = { kind: 'none', scanned: 3, skipped: 2, limit: null };

export const FAILED_STUB: EdgeImportsResult = { kind: 'failed' };

const FILES_LIMIT_STUB: EdgeImportsResult = { ...FOUND_WEB_UI_STUB, limit: 'files' };

const ENTRIES_LIMIT_STUB: EdgeImportsResult = { ...FOUND_WEB_UI_STUB, limit: 'entries' };

const TIME_LIMIT_STUB: EdgeImportsResult = { ...FOUND_WEB_UI_STUB, limit: 'time' };

/** `FOUND_WEB_UI_STUB` cut short by each scan cap. */
export const LIMIT_FOUND_STUB: Record<ImportLimit, EdgeImportsResult> = {
  files: FILES_LIMIT_STUB,
  entries: ENTRIES_LIMIT_STUB,
  time: TIME_LIMIT_STUB
};
