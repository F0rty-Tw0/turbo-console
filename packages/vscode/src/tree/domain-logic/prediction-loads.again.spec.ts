import { beforeEach, describe, expect, it } from 'vitest';

import { PredictionLoads } from './prediction-loads.ts';
import { OTHER_ROOT, ROOT } from '../test/common/atom-load.const.ts';
import { ID_A, PKG_A, PKG_B } from '../test/common/prediction-load.const.ts';
import type { PredictionHarness, PredictionState } from '../test/common/prediction-load.type.ts';
import { dryRunAt, dryStateOf, flush } from '../test/utils/atom-load.spec.util.ts';
import { predictionHarness, toState } from '../test/utils/prediction-load.spec.util.ts';
import { buildModelOf, packageNamesOf } from '../test/utils/prediction-model.spec.util.ts';

const IDLE: PredictionState[] = ['queued'];

const RESTARTED: PredictionState[] = ['loading', 'loaded', 'failed'];

describe('FEATURE: prediction loads asked again', () => {
  let h: PredictionHarness;
  let store: PredictionLoads;

  beforeEach(() => {
    h = predictionHarness();
    store = new PredictionLoads(h.ports);
  });

  describe('GIVEN an absent package', () => {
    it('WHEN a run ends or everything refreshes THEN nothing queues', () => {
      store.toggled(true);
      store.runEnded(ROOT);
      store.refreshAll();

      expect(h.timers).toStrictEqual([]);
    });
  });

  describe.each(IDLE)('GIVEN a %s package', (state) => {
    it('WHEN a run ends or everything refreshes THEN it is ignored: one timer and one spawn', async () => {
      await toState(h, store, state);
      store.runEnded(ROOT);
      store.refreshAll();
      h.fire();

      expect(h.timers).toHaveLength(1);
      expect(h.dryRun).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN a loading package', () => {
    beforeEach(async () => {
      await toState(h, store, 'loading');
    });

    it('WHEN a run ends THEN the old run is aborted and a new timer starts', () => {
      store.runEnded(ROOT);

      expect(dryRunAt(h, 0).signal.aborted).toBe(true);
      expect(h.pendingTimers()).toHaveLength(1);
    });

    it('WHEN a run ends and the window passes THEN a second spawn starts', () => {
      store.runEnded(ROOT);
      h.fire();

      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });
  });

  describe('GIVEN a loaded package', () => {
    beforeEach(async () => {
      await toState(h, store, 'loaded');
    });

    it('WHEN a run ends THEN the old answer is still read and a new timer starts', () => {
      store.runEnded(ROOT);

      expect(store.view(ROOT, PKG_A)?.tasks).toStrictEqual(new Map([[ID_A, 'HIT']]));
      expect(h.pendingTimers()).toHaveLength(1);
    });

    it('WHEN a run ends of another root THEN nothing queues', () => {
      store.runEnded(OTHER_ROOT);

      expect(h.pendingTimers()).toStrictEqual([]);
    });

    it('WHEN a run ends and the new run settles THEN the new answer replaces the old', async () => {
      store.runEnded(ROOT);
      h.fire();
      dryRunAt(h, 1).resolve([dryStateOf(ID_A, 'MISS')]);
      await flush();

      expect(store.view(ROOT, PKG_A)?.tasks.get(ID_A)).toBe('MISS');
    });
  });

  describe('GIVEN a failed package', () => {
    it('WHEN a run ends THEN a new timer starts and a new spawn follows', async () => {
      await toState(h, store, 'failed');
      store.runEnded(ROOT);

      expect(h.pendingTimers()).toHaveLength(1);

      h.fire();

      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });
  });

  describe('GIVEN two loaded packages of one root', () => {
    it('WHEN a run ends THEN one new spawn asks for both', async () => {
      h.model(ROOT, buildModelOf([PKG_A, PKG_B]));
      store.toggled(true);
      store.packageShown(ROOT, PKG_A);
      store.packageShown(ROOT, PKG_B);
      h.fire();
      dryRunAt(h, 0).resolve([]);
      await flush();
      store.runEnded(ROOT);
      h.fire();

      expect(h.dryRun).toHaveBeenCalledTimes(2);
      expect(dryRunAt(h, 1).request.packages).toStrictEqual([PKG_A, PKG_B]);
    });
  });

  describe.each(RESTARTED)('GIVEN a %s package and a refresh of everything', (state) => {
    it('WHEN everything refreshes THEN it queues again', async () => {
      await toState(h, store, state);
      store.refreshAll();

      expect(h.pendingTimers()).toHaveLength(1);
    });
  });

  describe('GIVEN ten loaded packages', () => {
    it('WHEN everything refreshes THEN one timer and one spawn ask for all ten', async () => {
      const names = packageNamesOf(10);

      h.model(ROOT, buildModelOf(names));
      store.toggled(true);
      names.forEach((name) => store.packageShown(ROOT, name));
      h.fire();
      dryRunAt(h, 0).resolve([]);
      await flush();
      store.refreshAll();

      expect(h.pendingTimers()).toHaveLength(1);

      h.fire();

      expect(h.dryRun).toHaveBeenCalledTimes(2);
      expect(dryRunAt(h, 1).request.packages).toStrictEqual(names);
    });
  });
});
