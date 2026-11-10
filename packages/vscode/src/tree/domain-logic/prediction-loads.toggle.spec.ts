import { beforeEach, describe, expect, it } from 'vitest';

import { PredictionLoads } from './prediction-loads.ts';
import { ROOT } from '../test/common/atom-load.const.ts';
import { PKG_A, PKG_B } from '../test/common/prediction-load.const.ts';
import type { PredictionHarness, PredictionState } from '../test/common/prediction-load.type.ts';
import { dryRunAt, dryStateOf, flush } from '../test/utils/atom-load.spec.util.ts';
import { changeOf, predictionHarness, toState } from '../test/utils/prediction-load.spec.util.ts';
import { buildModelOf, packageNamesOf } from '../test/utils/prediction-model.spec.util.ts';

type StoreAction = (store: PredictionLoads) => void;

const SHOW: StoreAction = (store): void => {
  store.packageShown(ROOT, PKG_A);
};

const END_RUN: StoreAction = (store): void => {
  store.runEnded(ROOT);
};

const REFRESH: StoreAction = (store): void => {
  store.refreshAll();
};

const CHANGE_MODEL: StoreAction = (store): void => {
  store.modelChanged(changeOf(null, buildModelOf([PKG_A])));
};

const KEEP_NONE: StoreAction = (store): void => {
  store.rootsKept(new Set());
};

const TOGGLE_OFF: StoreAction = (store): void => {
  store.toggled(false);
};

const IGNORED: [string, StoreAction][] = [
  ['packageShown arrives', SHOW],
  ['a run ends', END_RUN],
  ['everything refreshes', REFRESH],
  ['the model changes', CHANGE_MODEL],
  ['the kept roots are set', KEEP_NONE],
  ['the toggle goes off again', TOGGLE_OFF]
];

const SETTLED: PredictionState[] = ['loaded', 'failed'];

describe('FEATURE: prediction loads toggle', () => {
  let h: PredictionHarness;
  let store: PredictionLoads;

  beforeEach(() => {
    h = predictionHarness();
    store = new PredictionLoads(h.ports);
  });

  describe('GIVEN the toggle is off', () => {
    it('WHEN it goes on THEN no timer starts, nothing spawns and nothing is announced', () => {
      store.toggled(true);

      expect(h.timers).toStrictEqual([]);
      expect(h.dryRun).not.toHaveBeenCalled();
      expect(h.changed).not.toHaveBeenCalled();
      expect(store.view(ROOT, PKG_A)).toBeNull();
    });

    it.each(IGNORED)('WHEN %s THEN no timer starts, nothing spawns and nothing is logged', (_when, act) => {
      h.model(ROOT, buildModelOf([PKG_A]));

      act(store);
      h.fire();

      expect(h.timers).toStrictEqual([]);
      expect(h.dryRun).not.toHaveBeenCalled();
      expect(h.log).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN the toggle is on and nothing is shown', () => {
    it('WHEN it goes off THEN nothing happens and a later packageShown queues nothing until it goes on', () => {
      h.model(ROOT, buildModelOf([PKG_A]));
      store.toggled(true);
      store.toggled(false);
      store.packageShown(ROOT, PKG_A);

      expect(h.timers).toStrictEqual([]);

      store.toggled(true);
      store.packageShown(ROOT, PKG_A);

      expect(h.pendingTimers()).toHaveLength(1);
    });
  });

  describe('GIVEN a queued package', () => {
    beforeEach(async () => {
      await toState(h, store, 'queued');
    });

    it('WHEN the toggle goes off THEN the window never sends and nothing is announced', () => {
      store.toggled(false);
      h.fire();

      expect(h.dryRun).not.toHaveBeenCalled();
      expect(h.pendingTimers()).toStrictEqual([]);
      expect(h.changed).not.toHaveBeenCalled();
    });

    it('WHEN the toggle goes on again THEN it stays on and keeps the queue', () => {
      store.toggled(true);
      h.fire();

      expect(h.dryRun).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN a loading package', () => {
    beforeEach(async () => {
      await toState(h, store, 'loading');
    });

    it('WHEN the toggle goes off THEN its dry run is aborted', () => {
      store.toggled(false);

      expect(dryRunAt(h, 0).signal.aborted).toBe(true);
    });

    it('WHEN the toggle goes off and the run then resolves THEN nothing is stored or announced', async () => {
      store.toggled(false);
      dryRunAt(h, 0).resolve([dryStateOf('@fx/a#build', 'HIT')]);
      await flush();

      expect(store.view(ROOT, PKG_A)).toBeNull();
      expect(h.changed).not.toHaveBeenCalled();
    });

    it('WHEN the toggle goes off and the run then rejects THEN nothing is logged or announced', async () => {
      store.toggled(false);
      dryRunAt(h, 0).reject(new Error('late'));
      await flush();

      expect(h.log).not.toHaveBeenCalled();
      expect(h.changed).not.toHaveBeenCalled();
    });

    it('WHEN the toggle goes off and on within the window THEN the old result never stores, the old run is aborted, exactly one new spawn', async () => {
      const old = dryRunAt(h, 0);

      store.toggled(false);
      store.toggled(true);
      store.packageShown(ROOT, PKG_A);
      old.resolve([dryStateOf('@fx/a#build', 'HIT')]);
      await flush();

      expect(old.signal.aborted).toBe(true);
      expect(store.view(ROOT, PKG_A)).toBeNull();
      expect(h.changed).not.toHaveBeenCalled();

      h.fire();

      expect(h.dryRun).toHaveBeenCalledTimes(2);
      expect(dryRunAt(h, 1).signal.aborted).toBe(false);
    });
  });

  describe.each(SETTLED)('GIVEN a %s package', (state) => {
    beforeEach(async () => {
      await toState(h, store, state);
    });

    it('WHEN the toggle goes off THEN its view is gone and nothing is announced', () => {
      h.changed.mockClear();
      store.toggled(false);

      expect(store.view(ROOT, PKG_A)).toBeNull();
      expect(h.changed).not.toHaveBeenCalled();
    });

    it('WHEN the toggle goes off and on and it is shown again THEN a new dry run spawns', () => {
      store.toggled(false);
      store.toggled(true);
      store.packageShown(ROOT, PKG_A);
      h.fire();

      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });
  });

  describe('GIVEN a live dry run of two packages', () => {
    it('WHEN the toggle goes off THEN the one run is aborted', () => {
      h.model(ROOT, buildModelOf([PKG_A, PKG_B]));
      store.toggled(true);
      store.packageShown(ROOT, PKG_A);
      store.packageShown(ROOT, PKG_B);
      h.fire();
      store.toggled(false);

      expect(h.dryRuns).toHaveLength(1);
      expect(dryRunAt(h, 0).signal.aborted).toBe(true);
    });
  });

  describe('GIVEN 51 shown packages whose first run of 50 is live', () => {
    it('WHEN the toggle goes off THEN the waiting package never spawns and no timer is left', () => {
      const names = packageNamesOf(51);

      h.model(ROOT, buildModelOf(names));
      store.toggled(true);
      names.forEach((name) => store.packageShown(ROOT, name));
      h.fire();
      store.toggled(false);
      h.fire();

      expect(h.dryRun).toHaveBeenCalledOnce();
      expect(h.pendingTimers()).toStrictEqual([]);
    });
  });
});
