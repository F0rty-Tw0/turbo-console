import type { PredictionCache } from './prediction.type.ts';

/** The window, from the first package shown in a root, in which more packages join the same dry run. */
export const PREDICTION_BATCH_MS = 300;

/** The most packages one dry run carries; a root with more sends them in chunks, one live run at a time. */
export const PREDICTION_BATCH_MAX = 50;

export const PREDICTION_WORDS: Readonly<Record<PredictionCache, string>> = {
  HIT: 'cached',
  MISS: 'not cached',
  deferred: 'unknown'
};

export const PREDICTION_PHRASES: Readonly<Record<PredictionCache, string>> = {
  HIT: 'cached, will replay',
  MISS: 'not cached, will run',
  deferred: 'unknown, decided at run time'
};
