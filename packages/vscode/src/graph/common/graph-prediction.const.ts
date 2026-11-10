import type { GraphPrediction } from '@turbo-console/webview-ui';

import type { PredictionCache } from '../../tree/common/prediction.type.ts';

/** The wire word of each dry-run answer, as the graph page reads it. */
export const PREDICTION_WORDS_BY_CACHE: Readonly<Record<PredictionCache, GraphPrediction>> = {
  HIT: 'cached',
  MISS: 'notCached',
  deferred: 'unknown'
};
