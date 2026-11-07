import type { ImportKind, ImportLimit, ImportVia } from '../../bridge/common/graph-imports.type.ts';

/** The rows the imports block shows before "Show more" (spec D14). */
export const IMPORTS_FOLD_AT = 20;

export const NO_IMPORTS_WORD = 'No imports found';

/** The word of a none reply that skipped files: the scan did not see every file. */
export const NONE_IN_SCANNED_WORD = 'None found in scanned files';

export const SCAN_FAILED_WORD = "Couldn't scan";

export const SCANNING_AGAIN_TEXT = 'Scanning again…';

/** How long a new imports status line stays empty before its first text, so a screen reader has the `role=status` line in the accessibility tree and reads the text out as a change. */
export const IMPORTS_STATUS_DELAY_MS = 100;

/** What the status line reads out while a first scan runs. */
export const SCANNING_STATUS_TEXT = 'Scanning for imports';

/** What the status line reads out when a scan fails; the visible line keeps the short `SCAN_FAILED_WORD`. */
export const SCAN_FAILED_STATUS_TEXT = "Couldn't scan for imports";

export const SCAN_AGAIN_TITLE = 'Scan the files again';

export const TYPE_TAG = 'type';

/** The tag a row shows for how it brings the module in; a plain `import` shows none. */
export const KIND_TAGS: Readonly<Record<ImportKind, string | null>> = {
  static: null,
  reexport: 're-export',
  dynamic: 'dynamic',
  require: 'require'
};

/** The tag a row shows for how it names the target; the package name shows none. */
export const VIA_TAGS: Readonly<Record<ImportVia, string | null>> = {
  name: null,
  relative: 'relative path',
  alias: 'alias'
};

/** The numbers mirror the core scan caps; a cap change must update them (spec D14). */
export const LIMIT_NOTES: Readonly<Record<ImportLimit, string>> = {
  files: 'Stopped at 5,000 files; there may be more.',
  entries: 'Stopped at 50,000 folder entries; there may be more.',
  time: 'Stopped after 4 s; there may be more.'
};
