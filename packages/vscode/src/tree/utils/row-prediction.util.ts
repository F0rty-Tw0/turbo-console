import type { TaskNode } from '@turbo-console/core';

import { predictionLineOf, predictionWordOf } from './prediction-text.util.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import type { PredictionView } from '../common/prediction.type.ts';
import type { RowPrediction } from '../common/row-prediction.type.ts';

/**
 * A turbo task that is not continuous and not running shows its predicted cache word; an ended run keeps its icon and
 * actions. A persistent task keeps `continuous` even when a stale view still holds its id.
 */
export const rowPredictionOf = (task: TaskNode, entry: RunEntry | undefined, view: PredictionView | null): RowPrediction | null => {
  if (view === null) return null;

  if (!task.isTurboTask || task.persistent) return null;

  if (entry?.state === 'running') return null;

  const cache = view.tasks.get(task.id);

  if (cache === undefined) return null;

  const prediction: RowPrediction = { description: predictionWordOf(cache), line: predictionLineOf(cache, view.settledAt) };

  return prediction;
};
