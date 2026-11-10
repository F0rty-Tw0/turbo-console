import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { sharedPredictionOf } from './shared-prediction.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { PredictionListener, SharedPrediction } from '../common/prediction.type.ts';
import { ROOT } from '../test/common/atom-load.const.ts';
import { ID_A, PKG_A } from '../test/common/prediction-load.const.ts';
import type { PredictionHarness } from '../test/common/prediction-load.type.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { dryRunAt, dryStateOf, flush } from '../test/utils/atom-load.spec.util.ts';
import { loadedOf } from '../test/utils/atom-tree.spec.util.ts';
import { changeOf, predictionHarness } from '../test/utils/prediction-load.spec.util.ts';
import { buildModelOf } from '../test/utils/prediction-model.spec.util.ts';

describe('FEATURE: shared cache prediction', () => {
  let h: PredictionHarness;
  let prediction: SharedPrediction;

  const startRun = (): void => {
    prediction.toggled(true);
    prediction.packageShown(ROOT, PKG_A);
    h.fire();
  };

  const settleRun = async (): Promise<void> => {
    dryRunAt(h, 0).resolve([dryStateOf(ID_A, 'HIT')]);
    await flush();
  };

  beforeEach(() => {
    h = predictionHarness();

    const store = new RootStore();

    store.set([ROOT_FOLDER_STUB], coordinatorMock);
    store.apply(ROOT, loadedOf(buildModelOf([PKG_A])));
    prediction = sharedPredictionOf(store, h.ports);
  });

  describe('GIVEN two subscribed listeners', () => {
    let first: Mock<PredictionListener>;
    let second: Mock<PredictionListener>;

    beforeEach(() => {
      first = vi.fn<PredictionListener>();
      second = vi.fn<PredictionListener>();
      prediction.onDidChange(first);
      prediction.onDidChange(second);
      startRun();
    });

    it('WHEN a load settles THEN the first listener hears (root, the settled package) once', async () => {
      await settleRun();

      expect(first).toHaveBeenCalledExactlyOnceWith(ROOT, new Set([PKG_A]));
    });

    it('WHEN a load settles THEN the second listener hears (root, the settled package) once', async () => {
      await settleRun();

      expect(second).toHaveBeenCalledExactlyOnceWith(ROOT, new Set([PKG_A]));
    });

    it('WHEN disposed THEN a settling run reaches no listener', async () => {
      prediction.dispose();
      await settleRun();

      expect(first).not.toHaveBeenCalled();
      expect(second).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a first listener that throws and a second listener', () => {
    let second: Mock<PredictionListener>;

    beforeEach(() => {
      const first = vi.fn<PredictionListener>(() => {
        throw new Error('boom');
      });

      second = vi.fn<PredictionListener>();
      prediction.onDidChange(first);
      prediction.onDidChange(second);
      startRun();
    });

    it('WHEN a load settles THEN the second listener still hears (root, the settled package) once', async () => {
      await settleRun();

      expect(second).toHaveBeenCalledExactlyOnceWith(ROOT, new Set([PKG_A]));
    });

    it('WHEN a load settles THEN the log names the root and the error', async () => {
      await settleRun();

      expect(h.log).toHaveBeenCalledExactlyOnceWith(`prediction ${ROOT}: listener failed: boom`);
    });
  });

  describe('GIVEN a listener that unsubscribed', () => {
    it('WHEN a load settles THEN it hears nothing', async () => {
      const listener = vi.fn<PredictionListener>();
      const off = prediction.onDidChange(listener);

      off();
      startRun();
      await settleRun();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a store disposed while the toggle is on', () => {
    it('WHEN a package is shown and the toggle turns on again THEN no timer starts', () => {
      prediction.toggled(true);
      prediction.dispose();
      prediction.toggled(true);
      prediction.packageShown(ROOT, PKG_A);

      expect(h.pendingTimers()).toHaveLength(0);
    });
  });

  describe('GIVEN a package that waits for a binary', () => {
    beforeEach(() => {
      h.noBinary();
      prediction.toggled(true);
      prediction.packageShown(ROOT, PKG_A);
      h.binary();
    });

    it('WHEN modelChanged is called THEN the store receives the change and the package asks again', () => {
      prediction.modelChanged(changeOf(null, buildModelOf([PKG_A])));

      expect(h.pendingTimers()).toHaveLength(1);
    });
  });
});
