import { beforeEach, describe, expect, it } from 'vitest';

import { PredictionLoads } from './prediction-loads.ts';
import { OTHER_ROOT, ROOT } from '../test/common/atom-load.const.ts';
import { ID_A, PKG_A, PKG_B, PKG_C } from '../test/common/prediction-load.const.ts';
import type { PredictionHarness } from '../test/common/prediction-load.type.ts';
import { dryRunAt, dryStateOf, flush } from '../test/utils/atom-load.spec.util.ts';
import { predictionHarness, toState } from '../test/utils/prediction-load.spec.util.ts';
import { buildModelOf, packageNamesOf, predictionModelOf, turboTaskOf } from '../test/utils/prediction-model.spec.util.ts';

describe('FEATURE: prediction loads batching', () => {
  let h: PredictionHarness;
  let store: PredictionLoads;

  const showAll = (names: string[]): void => {
    h.model(ROOT, buildModelOf(names));
    store.toggled(true);
    names.forEach((name) => store.packageShown(ROOT, name));
  };

  beforeEach(() => {
    h = predictionHarness();
    store = new PredictionLoads(h.ports);
  });

  describe('GIVEN three packages shown inside the window', () => {
    beforeEach(() => {
      const packages = {
        [PKG_A]: [turboTaskOf(PKG_A, 'build'), turboTaskOf(PKG_A, 'lint')],
        [PKG_B]: [turboTaskOf(PKG_B, 'build')],
        [PKG_C]: [turboTaskOf(PKG_C, 'test')]
      };

      h.model(ROOT, predictionModelOf(packages));
      store.toggled(true);
      store.packageShown(ROOT, PKG_A);
      store.packageShown(ROOT, PKG_B);
      store.packageShown(ROOT, PKG_C);
    });

    it('WHEN the window is open THEN one timer runs', () => {
      expect(h.timers).toHaveLength(1);
    });

    it('WHEN the window ends THEN one dry run carries the three and the union of their tasks', () => {
      h.fire();

      expect(h.dryRun).toHaveBeenCalledOnce();
      expect(dryRunAt(h, 0).request).toStrictEqual({
        tasks: ['build', 'lint', 'test'],
        packages: [PKG_A, PKG_B, PKG_C],
        singlePackage: false
      });
    });
  });

  describe('GIVEN one package shown inside the window', () => {
    it('WHEN a second package is shown THEN the window does not restart', () => {
      showAll([PKG_A]);
      store.packageShown(ROOT, PKG_B);

      expect(h.timers).toHaveLength(1);
    });
  });

  describe('GIVEN a live run of the root', () => {
    beforeEach(async () => {
      await toState(h, store, 'loading');
      h.model(ROOT, buildModelOf([PKG_A, PKG_B, PKG_C]));
    });

    describe('GIVEN the window of a second package ended', () => {
      beforeEach(() => {
        store.packageShown(ROOT, PKG_B);
        h.fire();
      });

      it('WHEN the first run has not settled THEN no second run starts', () => {
        expect(h.dryRun).toHaveBeenCalledOnce();
      });

      it('WHEN the first run settles THEN a second run asks for the second package', async () => {
        dryRunAt(h, 0).resolve([]);
        await flush();

        expect(h.dryRun).toHaveBeenCalledTimes(2);
        expect(dryRunAt(h, 1).request.packages).toStrictEqual([PKG_B]);
      });
    });

    it('WHEN more packages keep joining the waiting batch THEN the next run carries them all', async () => {
      store.packageShown(ROOT, PKG_B);
      h.fire();
      store.packageShown(ROOT, PKG_C);
      dryRunAt(h, 0).resolve([]);
      await flush();

      expect(dryRunAt(h, 1).request.packages).toStrictEqual([PKG_B, PKG_C]);
    });

    it('WHEN the live run is superseded and a batch waits THEN the waiting batch is sent at once, holding the re-queued package too', () => {
      store.packageShown(ROOT, PKG_B);
      h.fire();
      store.runEnded(ROOT);

      expect(h.dryRun).toHaveBeenCalledTimes(2);
      expect(dryRunAt(h, 0).signal.aborted).toBe(true);
      expect(dryRunAt(h, 1).request.packages).toStrictEqual([PKG_B, PKG_A]);
    });

    it('WHEN the live run settles with nothing waiting THEN no run starts', async () => {
      dryRunAt(h, 0).resolve([dryStateOf(ID_A, 'HIT')]);
      await flush();

      expect(h.dryRun).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN packages in two roots', () => {
    it('WHEN both windows end THEN each root has one live run at the same time', () => {
      h.model(ROOT, buildModelOf([PKG_A]));
      h.model(OTHER_ROOT, buildModelOf([PKG_A]));
      store.toggled(true);
      store.packageShown(ROOT, PKG_A);
      store.packageShown(OTHER_ROOT, PKG_A);
      h.fire();

      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });
  });

  describe('GIVEN exactly 50 shown packages', () => {
    it('WHEN the window ends THEN one run of 50 starts', () => {
      showAll(packageNamesOf(50));
      h.fire();

      expect(h.dryRun).toHaveBeenCalledOnce();
      expect(dryRunAt(h, 0).request.packages).toHaveLength(50);
    });
  });

  describe('GIVEN 51 shown packages', () => {
    const names = packageNamesOf(51);

    beforeEach(() => {
      showAll(names);
      h.fire();
    });

    it('WHEN the window ends THEN a run of 50 starts and the 51st waits', () => {
      expect(h.dryRun).toHaveBeenCalledOnce();
      expect(dryRunAt(h, 0).request.packages).toHaveLength(50);
    });

    it('WHEN the first run settles THEN the run of the 51st starts', async () => {
      dryRunAt(h, 0).resolve([]);
      await flush();

      expect(h.dryRun).toHaveBeenCalledTimes(2);
      expect(dryRunAt(h, 1).request.packages).toStrictEqual([names[50]]);
    });

    describe('GIVEN a 52nd shown after the first run started', () => {
      beforeEach(() => {
        h.model(ROOT, buildModelOf([...names, 'late']));
        store.packageShown(ROOT, 'late');
      });

      it('WHEN nothing else happens THEN it opens no window', () => {
        expect(h.pendingTimers()).toStrictEqual([]);
      });

      it('WHEN the first run settles THEN it joins the second run', async () => {
        dryRunAt(h, 0).resolve([]);
        await flush();

        expect(dryRunAt(h, 1).request.packages).toStrictEqual([names[50], 'late']);
      });
    });

    it('WHEN the first chunk rejects THEN its packages fail and the second chunk is still sent', async () => {
      dryRunAt(h, 0).reject(new Error('boom'));
      await flush();

      expect(store.view(ROOT, names[0] ?? '')).toBeNull();
      expect(h.log).toHaveBeenCalledOnce();
      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });
  });
});
