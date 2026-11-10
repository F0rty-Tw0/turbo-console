import { PREDICTION_BATCH_MS, PREDICTION_WORDS } from '../../src/tree/common/prediction.const.ts';

export const SHOW_PREDICTION_COMMAND = 'turboConsole.showPrediction';

export const HIDE_PREDICTION_COMMAND = 'turboConsole.hidePrediction';

export const CLOSE_EDITOR_COMMAND = 'workbench.action.closeActiveEditor';

export const FILTER_PREFIX = '--filter=';

/** The words a task row reads once its package has a prediction. */
export const PREDICTION_WORD_SET: ReadonlySet<string> = new Set(Object.values(PREDICTION_WORDS));

export const CACHED_WORD = PREDICTION_WORDS.HIT;

/** Two batch windows and a second: a dry run that was due has been sent by now. */
export const QUIET_WINDOW_MS = 2 * PREDICTION_BATCH_MS + 1000;

/** Two batch windows and 10 s: one dry run of a few packages settles inside this on a loaded machine. */
export const SETTLE_LIMIT_MS = 2 * PREDICTION_BATCH_MS + 10_000;

/** How many short runs case P6 starts back to back. */
export const BURST_RUNS = 5;

/** The gap between run starts in case P6b: one batch window and a typical dry run, so each end can find the last dry run live. */
export const BURST_STAGGER_MS = PREDICTION_BATCH_MS + 50;
