/** The window, from the first package shown in a root, in which more packages join the same dry run. */
export const PREDICTION_BATCH_MS = 300;

/** The most packages one dry run carries; a root with more sends them in chunks, one live run at a time. */
export const PREDICTION_BATCH_MAX = 50;
