import { PREDICTION_BATCH_MS, PREDICTION_WORDS } from '../../src/tree/common/prediction.const.ts';

export const SHOW_PREDICTION_COMMAND = 'turboConsole.showPrediction';

export const HIDE_PREDICTION_COMMAND = 'turboConsole.hidePrediction';

export const REFRESH_COMMAND = 'turboConsole.refresh';

export const FILTER_PREFIX = '--filter=';

/** The words a task row reads once its package has a prediction. */
export const PREDICTION_WORD_SET: ReadonlySet<string> = new Set(Object.values(PREDICTION_WORDS));

export const CACHED_WORD = PREDICTION_WORDS.HIT;

export const NOT_CACHED_WORD = PREDICTION_WORDS.MISS;

/** Two batch windows and a second: a dry run that was due has been sent by now. */
export const QUIET_WINDOW_MS = 2 * PREDICTION_BATCH_MS + 1000;

/**
 * Two batch windows and 10 s: the timing claim of case P6, which `budget` scales by the CI factor. The waits that
 * decide pass or fail use `WAIT_LIMIT_MS`, not this.
 */
export const SETTLE_LIMIT_MS = 2 * PREDICTION_BATCH_MS + 10_000;

/** How many short runs case P6 starts back to back. */
export const BURST_RUNS = 5;

/** The gap between run starts in case P6b: one batch window and 50 ms, so the run ends come about a window apart (the case logs the real gaps) and not inside one. */
export const BURST_STAGGER_MS = PREDICTION_BATCH_MS + 50;

/** The line the edit of case P5 appends to a source file of the package it changes. */
export const EDIT_LINE = '\n// edited by the prediction suite\n';

export const EDITED_FILE = 'src/index.ts';
