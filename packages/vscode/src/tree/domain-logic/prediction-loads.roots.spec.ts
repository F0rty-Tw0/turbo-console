import { beforeEach, describe, expect, it } from 'vitest';

import { PredictionLoads } from './prediction-loads.ts';
import { OTHER_ROOT, ROOT } from '../test/common/atom-load.const.ts';
import { ID_A, PKG_A, PREDICTION_STATES } from '../test/common/prediction-load.const.ts';
import type { PredictionHarness } from '../test/common/prediction-load.type.ts';
import { dryRunAt, dryStateOf, flush } from '../test/utils/atom-load.spec.util.ts';
import { changeOf, predictionHarness, toState } from '../test/utils/prediction-load.spec.util.ts';
import { buildModelOf } from '../test/utils/prediction-model.spec.util.ts';

describe('FEATURE: prediction loads of roots that are gone', () => {
  let h: PredictionHarness;
  let store: PredictionLoads;

  beforeEach(() => {
    h = predictionHarness();
    store = new PredictionLoads(h.ports);
  });

  describe.each(PREDICTION_STATES)('GIVEN a %s package in a root that is no longer kept', (state) => {
    beforeEach(async () => {
      await toState(h, store, state);
      h.changed.mockClear();
      store.rootsKept(new Set([OTHER_ROOT]));
    });

    it('WHEN the kept roots are set THEN it is absent, nothing spawns later and nothing is announced', () => {
      h.fire();

      expect(store.view(ROOT, PKG_A)).toBeNull();
      expect(h.dryRun).toHaveBeenCalledTimes(state === 'queued' ? 0 : 1);
      expect(h.changed).not.toHaveBeenCalled();
    });

    it('WHEN the root comes back and the package is shown THEN it queues again', () => {
      store.packageShown(ROOT, PKG_A);

      expect(h.pendingTimers()).toHaveLength(1);
    });
  });

  describe('GIVEN a loading package in a root that is no longer kept', () => {
    beforeEach(async () => {
      await toState(h, store, 'loading');
      store.rootsKept(new Set());
    });

    it('WHEN the kept roots are set THEN its run is aborted', () => {
      expect(dryRunAt(h, 0).signal.aborted).toBe(true);
    });

    it('WHEN the run then settles THEN nothing is stored, logged or announced', async () => {
      dryRunAt(h, 0).resolve([dryStateOf(ID_A, 'HIT')]);
      await flush();

      expect(store.view(ROOT, PKG_A)).toBeNull();
      expect(h.changed).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a loaded package in a kept root and a loaded package in another root', () => {
    it('WHEN the other root is dropped THEN the kept one stays', async () => {
      await toState(h, store, 'loaded');
      h.model(OTHER_ROOT, buildModelOf([PKG_A]));
      store.packageShown(OTHER_ROOT, PKG_A);
      store.rootsKept(new Set([ROOT]));

      expect(store.view(ROOT, PKG_A)).not.toBeNull();
      expect(h.pendingTimers()).toStrictEqual([]);
    });
  });

  describe('GIVEN a package waiting for a binary in a root that is no longer kept', () => {
    it('WHEN the root returns with a model THEN the package is not asked', () => {
      h.model(ROOT, buildModelOf([PKG_A]));
      h.noBinary();
      store.toggled(true);
      store.packageShown(ROOT, PKG_A);
      store.rootsKept(new Set());
      h.binary();
      store.modelChanged(changeOf(null, buildModelOf([PKG_A])));

      expect(h.timers).toStrictEqual([]);
    });
  });

  describe('GIVEN a loading package', () => {
    beforeEach(async () => {
      await toState(h, store, 'loading');
    });

    it('WHEN the store is disposed THEN the run is aborted and every timer is cancelled', () => {
      store.packageShown(OTHER_ROOT, PKG_A);
      store.dispose();

      expect(dryRunAt(h, 0).signal.aborted).toBe(true);
      expect(h.pendingTimers()).toStrictEqual([]);
    });

    it('WHEN the store is disposed and the run resolves THEN nothing is announced', async () => {
      store.dispose();
      dryRunAt(h, 0).resolve([dryStateOf(ID_A, 'HIT')]);
      await flush();

      expect(h.changed).not.toHaveBeenCalled();
      expect(store.view(ROOT, PKG_A)).toBeNull();
    });

    it('WHEN the store is disposed and the run rejects THEN nothing is logged or announced', async () => {
      store.dispose();
      dryRunAt(h, 0).reject(new Error('late'));
      await flush();

      expect(h.log).not.toHaveBeenCalled();
      expect(h.changed).not.toHaveBeenCalled();
    });

    it('WHEN the store is disposed and a package is shown THEN nothing queues, even after the toggle goes on', () => {
      store.dispose();
      store.toggled(true);
      store.packageShown(ROOT, PKG_A);

      expect(h.pendingTimers()).toStrictEqual([]);
    });
  });
});
