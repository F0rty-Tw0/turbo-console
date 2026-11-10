import type { DryRunState } from '@turbo-console/core';

import type { PredictionCache } from '../common/prediction.type.ts';

/** The cached-task states of a dry run grouped by owning package: only requested ids whose definition has `cache: true`. */
export const predictionTasksOf = (
  states: DryRunState[],
  requested: ReadonlyMap<string, string>
): Map<string, Map<string, PredictionCache>> => {
  const grouped = new Map<string, Map<string, PredictionCache>>();

  for (const state of states) {
    const packageName = requested.get(state.id);

    if (packageName === undefined || !state.definition.cache) continue;

    const rows = grouped.get(packageName) ?? new Map<string, PredictionCache>();

    rows.set(state.id, state.cache);
    grouped.set(packageName, rows);
  }

  return grouped;
};
