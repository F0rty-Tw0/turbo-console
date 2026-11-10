import type { PredictionCache, PredictionLookup, PredictionView } from '../../../tree/common/prediction.type.ts';

/** A prediction view that answers the packages named in `answers` with their task rows, and `null` for every other package. */
export const predictionViewOf = (answers: Record<string, [string, PredictionCache][]>): PredictionLookup => {
  return (_root, packageName) => {
    const rows = answers[packageName];

    if (rows === undefined) return null;

    const view: PredictionView = { settledAt: 1, tasks: new Map(rows) };

    return view;
  };
};
