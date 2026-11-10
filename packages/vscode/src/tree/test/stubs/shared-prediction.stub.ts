import type { SharedPrediction } from '../../common/prediction.type.ts';

/** Shared prediction that never loads: every package reads as having no prediction, and no listener ever hears. */
export const SHARED_PREDICTION_STUB: SharedPrediction = {
  view: () => null,
  packageShown: () => undefined,
  toggled: () => undefined,
  runEnded: () => undefined,
  modelChanged: () => undefined,
  refreshAll: () => undefined,
  rootsKept: () => undefined,
  dispose: () => undefined,
  onDidChange: () => () => undefined
};
