import { vi } from 'vitest';

import type { PredictionListener, SharedPrediction } from '../../common/prediction.type.ts';
import type { SharedPredictionFake } from '../common/shared-prediction-fake.type.ts';

/** The one `SharedPrediction` fake: every member a spy, and `emit(root)` calls the listeners `onDidChange` collected. */
export const sharedPredictionMock = (): SharedPredictionFake => {
  const listeners = new Set<PredictionListener>();
  const onDidChange = vi.fn((listener: PredictionListener): (() => void) => {
    listeners.add(listener);

    return (): void => {
      listeners.delete(listener);
    };
  });
  const emit: PredictionListener = (root) => {
    for (const listener of listeners) listener(root);
  };
  const shared: SharedPrediction = {
    view: vi.fn(() => null),
    packageShown: vi.fn(),
    toggled: vi.fn(),
    runEnded: vi.fn(),
    modelChanged: vi.fn(),
    refreshAll: vi.fn(),
    rootsKept: vi.fn(),
    dispose: vi.fn(),
    onDidChange
  };
  const fake: SharedPredictionFake = { ...shared, emit };

  return fake;
};
