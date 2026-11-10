import { PREDICTION_PHRASES, PREDICTION_WORDS } from '../common/prediction-text.const.ts';
import type { PredictionCache } from '../common/prediction.type.ts';

const twoDigits = (value: number): string => String(value).padStart(2, '0');

const clockOf = (at: number): string => {
  const date = new Date(at);

  return `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
};

export const predictionWordOf = (cache: PredictionCache): string => PREDICTION_WORDS[cache];

export const predictionLineOf = (cache: PredictionCache, settledAt: number): string =>
  `Prediction: ${PREDICTION_PHRASES[cache]} (as of ${clockOf(settledAt)})`;
