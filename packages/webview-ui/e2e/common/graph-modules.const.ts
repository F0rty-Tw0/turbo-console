/** The modules bar, by the id spec §7.4 names. */
export const MODULES_BAR = '#graph-modules-bar';

/** The module Controls panel, which holds the View boxes and Reset view (spec §6.2). */
export const MODULE_CONTROLS = '#graph-module-controls';

export const BACK_LABEL = 'Back';

export const REFRESH_LABEL = 'Refresh';

export const RESET_VIEW_LABEL = 'Reset view';

export const SHOW_MODULES_LABEL = 'Show modules';

export const RETRY_LABEL = 'Retry';

export const TYPES_LABEL = 'Type-only imports';

export const TESTS_LABEL = 'Test files';

export const LAZIES_LABEL = 'Dynamic/require';

export const LIMIT_FILES_TEXT =
  'Partial: the scan stopped at the file limit. Files past it are not shown, and imports of them count as unresolved.';

export const LIMIT_TIME_TEXT = 'Partial: the scan ran out of time. Some files are shown without their imports.';

/** The D9 view of `MODULES_APP_STUB`: the root box, `src` open, `views` and `model` collapsed, `index.ts` and the `lib` stub. */
export const D9_IDS = ['dir:', 'dir:src', 'dir:src/model', 'dir:src/views', 'file:index.ts', 'pkg:lib'];

/** The D9 edges, `<source>→<target> <line style>`: `views` → `model` merges a type and a lazy import, so lazy wins and it is dotted; `views`' own links are self-pairs. */
export const D9_EDGES = ['dir:src/views→dir:src/model dotted', 'dir:src/views→pkg:lib solid', 'file:index.ts→dir:src/views solid'];

const TEST_FILE_ID = 'file:src/views/main.spec.ts';

const TEST_FILE_EDGE = 'file:src/views/main.spec.ts→file:src/views/main.ts solid';

/** The D9 view with `views` expanded into its two files, its test file hidden as Test files starts unchecked. */
export const VIEWS_IDS = [...D9_IDS, 'file:src/views/main.ts', 'file:src/views/panel.ts'];

export const VIEWS_EDGES = [
  'file:index.ts→file:src/views/main.ts solid',
  'file:src/views/main.ts→dir:src/model dashed',
  'file:src/views/main.ts→file:src/views/panel.ts solid',
  'file:src/views/panel.ts→dir:src/model dotted',
  'file:src/views/panel.ts→pkg:lib solid'
];

/** `views` expanded with Test files checked: its three files, the test file's link with them. */
export const VIEWS_TESTS_IDS = [...VIEWS_IDS, TEST_FILE_ID];

export const VIEWS_TESTS_EDGES = [...VIEWS_EDGES, TEST_FILE_EDGE];
