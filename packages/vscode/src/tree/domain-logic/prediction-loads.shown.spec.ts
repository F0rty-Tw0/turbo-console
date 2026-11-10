import { beforeEach, describe, expect, it } from 'vitest';

import { PredictionLoads } from './prediction-loads.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import { ROOT } from '../test/common/atom-load.const.ts';
import { PKG_A, PKG_B } from '../test/common/prediction-load.const.ts';
import type { PredictionHarness } from '../test/common/prediction-load.type.ts';
import { dryRunAt } from '../test/utils/atom-load.spec.util.ts';
import { changeOf, predictionHarness, toState } from '../test/utils/prediction-load.spec.util.ts';
import { buildModelOf } from '../test/utils/prediction-model.spec.util.ts';

const REASKS = [1, 2, 3, 4, 5];

describe('FEATURE: prediction loads when a package is shown', () => {
  let h: PredictionHarness;
  let store: PredictionLoads;

  beforeEach(() => {
    h = predictionHarness();
    store = new PredictionLoads(h.ports);
  });

  describe('GIVEN an absent package', () => {
    beforeEach(() => {
      h.model(ROOT, buildModelOf([PKG_A]));
      store.toggled(true);
      store.packageShown(ROOT, PKG_A);
    });

    it('WHEN it is shown THEN one 300 ms timer is pending, nothing spawns and the view is empty', () => {
      expect(h.pendingTimers().map((timer) => timer.ms)).toStrictEqual([300]);
      expect(h.dryRun).not.toHaveBeenCalled();
      expect(store.view(ROOT, PKG_A)).toBeNull();
    });

    it('WHEN the window ends THEN one dry run asks for build of that package with the binary and an abort signal', () => {
      h.fire();

      expect(h.dryRun).toHaveBeenCalledExactlyOnceWith(
        TURBO_BINARY_STUB,
        { tasks: ['build'], packages: [PKG_A], singlePackage: false },
        expect.any(AbortSignal)
      );
    });
  });

  describe('GIVEN a queued package', () => {
    beforeEach(async () => {
      await toState(h, store, 'queued');
    });

    it('WHEN it is shown again THEN there is still one timer and one package is asked', () => {
      store.packageShown(ROOT, PKG_A);
      h.fire();

      expect(h.timers).toHaveLength(1);
      expect(dryRunAt(h, 0).request.packages).toStrictEqual([PKG_A]);
    });
  });

  describe('GIVEN a loading package', () => {
    it('WHEN it is shown again THEN there is no second spawn and no new timer', async () => {
      await toState(h, store, 'loading');
      store.packageShown(ROOT, PKG_A);
      h.fire();

      expect(h.dryRun).toHaveBeenCalledOnce();
      expect(h.timers).toHaveLength(1);
    });
  });

  describe('GIVEN a loaded package', () => {
    it('WHEN it is shown again THEN there is no new timer and no respawn', async () => {
      await toState(h, store, 'loaded');
      store.packageShown(ROOT, PKG_A);
      h.fire();

      expect(h.dryRun).toHaveBeenCalledOnce();
      expect(h.timers).toHaveLength(1);
    });
  });

  describe('GIVEN a failed package', () => {
    it('WHEN it is shown three times THEN no timer starts', async () => {
      await toState(h, store, 'failed');
      store.packageShown(ROOT, PKG_A);
      store.packageShown(ROOT, PKG_A);
      store.packageShown(ROOT, PKG_A);

      expect(h.pendingTimers()).toStrictEqual([]);
    });

    it('WHEN it is shown and the store change re-asks (the tree does) THEN no second spawn', async () => {
      h.changed.mockImplementation(() => {
        store.packageShown(ROOT, PKG_A);
      });
      await toState(h, store, 'failed');
      REASKS.forEach(() => {
        store.packageShown(ROOT, PKG_A);
        h.fire();
      });

      expect(h.dryRun).toHaveBeenCalledOnce();
      expect(h.pendingTimers()).toStrictEqual([]);
    });
  });

  describe('GIVEN a root with no turbo binary', () => {
    beforeEach(() => {
      h.model(ROOT, buildModelOf([PKG_A]));
      h.noBinary();
      store.toggled(true);
      store.packageShown(ROOT, PKG_A);
    });

    it('WHEN a package is shown THEN no timer starts, nothing spawns and the view is empty', () => {
      expect(h.timers).toStrictEqual([]);
      expect(h.dryRun).not.toHaveBeenCalled();
      expect(store.view(ROOT, PKG_A)).toBeNull();
    });

    it('WHEN the binary arrives with a republished model of the same object THEN the package queues and then spawns', () => {
      const same = buildModelOf([PKG_A]);

      h.binary();
      store.modelChanged(changeOf(same, same));

      expect(h.pendingTimers()).toHaveLength(1);

      h.fire();

      expect(h.dryRun).toHaveBeenCalledOnce();
    });

    it('WHEN a model without the package arrives THEN it is forgotten, also by the next reload', () => {
      h.binary();
      store.modelChanged(changeOf(null, buildModelOf([PKG_B])));
      store.modelChanged(changeOf(null, buildModelOf([PKG_A])));

      expect(h.timers).toStrictEqual([]);
    });
  });

  describe('GIVEN a binary that vanishes between the queue and the send', () => {
    beforeEach(() => {
      h.model(ROOT, buildModelOf([PKG_A]));
      store.toggled(true);
      store.packageShown(ROOT, PKG_A);
      h.noBinary();
      h.fire();
    });

    it('WHEN the window ends THEN nothing spawns and the package is absent', () => {
      expect(h.dryRun).not.toHaveBeenCalled();
      expect(store.view(ROOT, PKG_A)).toBeNull();
    });

    it('WHEN the binary returns with a republished model THEN the package is asked again', () => {
      const same = buildModelOf([PKG_A]);

      h.binary();
      store.modelChanged(changeOf(same, same));
      h.fire();

      expect(h.dryRun).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN a root with no model', () => {
    it('WHEN the window ends THEN nothing spawns and the package waits for a model', () => {
      store.toggled(true);
      store.packageShown(ROOT, PKG_A);
      h.fire();

      const model = buildModelOf([PKG_A]);

      h.model(ROOT, model);
      store.modelChanged(changeOf(null, model));
      h.fire();

      expect(h.dryRun).toHaveBeenCalledOnce();
    });
  });
});
