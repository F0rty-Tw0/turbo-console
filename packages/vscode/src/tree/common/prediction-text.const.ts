import type { PredictionCache } from './prediction.type.ts';

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
