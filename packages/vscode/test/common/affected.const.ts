export const SHOW_AFFECTED_COMMAND = 'turboConsole.showAffected';

/** What marks a spawn as the affected query: its GraphQL text carries `affectedTasks(`; the model load's `query` spawn does not. */
export const AFFECTED_QUERY_MARK = 'affectedTasks(';

/** The words, view descriptions and branch below are spec §3 literals on purpose, not imports of the product constants. */
export const WORD_CHANGED = 'affected';

export const WORD_DEPENDENCY = 'affected via dependency';

export const LABEL_TASK = 'affected: task level';

export const LABEL_PACKAGE = 'affected: package level';

export const LABEL_UNAVAILABLE = 'affected: unavailable, see Output';

/** The line an uncommitted edit appends to a source file. */
export const UNCOMMITTED_LINE = '\n// uncommitted\n';

/** The files the edits touch, relative to their package. */
export const README_FILE = 'README.md';

export const SOURCE_FILE = 'src/index.ts';

export const FEAT_BRANCH = 'feat';
