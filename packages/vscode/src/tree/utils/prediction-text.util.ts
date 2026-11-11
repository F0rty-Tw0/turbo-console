import { clockOf } from './clock-text.util.ts';
import { PREDICTION_PHRASES, PREDICTION_WORDS } from '../common/prediction.const.ts';
import type { PredictionCache } from '../common/prediction.type.ts';

export const predictionWordOf = (cache: PredictionCache): string => PREDICTION_WORDS[cache];

export const predictionLineOf = (cache: PredictionCache, settledAt: number): string => {
  const phrase = PREDICTION_PHRASES[cache];
  const clock = clockOf(settledAt);

  return `Prediction: ${phrase} (as of ${clock})`;
};
