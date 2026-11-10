import type { GraphPrediction, GraphTask } from '@turbo-console/webview-ui';

import type { PredictionLookup } from '../../tree/common/prediction.type.ts';
import { PREDICTION_WORDS_BY_CACHE } from '../common/graph-prediction.const.ts';

const byPackageOf = (tasks: GraphTask[]): Map<string, GraphTask[]> => {
  const byPackage = new Map<string, GraphTask[]>();

  for (const task of tasks) {
    const group = byPackage.get(task.packageName) ?? [];

    group.push(task);
    byPackage.set(task.packageName, group);
  }

  return byPackage;
};

/**
 * The prediction word of every listed task whose package the store answered, keyed by task id. The view is read once per
 * package, in the order the packages first appear in `tasks`; a task the view does not name is left out.
 */
export const predictionsOf = (root: string, tasks: GraphTask[], view: PredictionLookup): Readonly<Record<string, GraphPrediction>> => {
  const predictions: Record<string, GraphPrediction> = {};

  for (const [packageName, group] of byPackageOf(tasks)) {
    const answer = view(root, packageName);

    if (answer === null) continue;

    for (const task of group) {
      const cache = answer.tasks.get(task.id);

      if (cache !== undefined) predictions[task.id] = PREDICTION_WORDS_BY_CACHE[cache];
    }
  }

  return predictions;
};
