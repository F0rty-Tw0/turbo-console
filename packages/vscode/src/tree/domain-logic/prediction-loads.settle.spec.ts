import { beforeEach, describe, expect, it } from 'vitest';

import { PredictionLoads } from './prediction-loads.ts';
import { ROOT } from '../test/common/atom-load.const.ts';
import { ID_A, ID_B, NOW_0, NOW_1, PKG_A, PKG_B } from '../test/common/prediction-load.const.ts';
import type { PredictionHarness } from '../test/common/prediction-load.type.ts';
import { dryRunAt, dryStateOf, flush } from '../test/utils/atom-load.spec.util.ts';
import { predictionHarness, toState } from '../test/utils/prediction-load.spec.util.ts';
import { buildModelOf, predictionModelOf, turboTaskOf, uncachedStateOf } from '../test/utils/prediction-model.spec.util.ts';

describe('FEATURE: prediction loads settling', () => {
  let h: PredictionHarness;
  let store: PredictionLoads;

  beforeEach(() => {
    h = predictionHarness();
    store = new PredictionLoads(h.ports);
  });

  describe('GIVEN a queued package that had an answer', () => {
    it('WHEN the window ends THEN it is loading and still reads the old answer', async () => {
      await toState(h, store, 'loaded');
      store.runEnded(ROOT);
      h.fire();

      expect(h.dryRun).toHaveBeenCalledTimes(2);
      expect(store.view(ROOT, PKG_A)?.tasks).toStrictEqual(new Map([[ID_A, 'HIT']]));
    });
  });

  describe('GIVEN a loading package', () => {
    beforeEach(async () => {
      await toState(h, store, 'loading');
    });

    it('WHEN the run settles OK later THEN the view holds the settle time and the words, announced once', async () => {
      h.setNow(NOW_1);
      dryRunAt(h, 0).resolve([dryStateOf(ID_A, 'HIT')]);
      await flush();

      expect(store.view(ROOT, PKG_A)).toStrictEqual({ settledAt: NOW_1, tasks: new Map([[ID_A, 'HIT']]) });
      expect(h.changed).toHaveBeenCalledExactlyOnceWith(ROOT);
    });

    it.each([['HIT'], ['MISS'], ['deferred']] as const)('WHEN the row says %s THEN it is stored as given', async (cache) => {
      dryRunAt(h, 0).resolve([dryStateOf(ID_A, cache)]);
      await flush();

      expect(store.view(ROOT, PKG_A)?.tasks.get(ID_A)).toBe(cache);
    });

    it('WHEN the row turns cache off THEN it is not in the view', async () => {
      dryRunAt(h, 0).resolve([uncachedStateOf(ID_A)]);
      await flush();

      expect(store.view(ROOT, PKG_A)).toStrictEqual({ settledAt: NOW_0, tasks: new Map() });
    });

    it('WHEN rows of another package or of a task not asked arrive THEN they are dropped', async () => {
      dryRunAt(h, 0).resolve([dryStateOf(ID_B, 'HIT'), dryStateOf('@fx/a#lint', 'HIT')]);
      await flush();

      expect(store.view(ROOT, PKG_A)?.tasks).toStrictEqual(new Map());
    });

    it('WHEN the run rejects THEN one line names the root, the package and the error, the view is empty and it is announced', async () => {
      dryRunAt(h, 0).reject(new Error('boom'));
      await flush();

      expect(h.log).toHaveBeenCalledExactlyOnceWith('prediction /ws @fx/a: boom');
      expect(store.view(ROOT, PKG_A)).toBeNull();
      expect(h.changed).toHaveBeenCalledExactlyOnceWith(ROOT);
    });

    it('WHEN the run is superseded and the old one resolves THEN nothing is stored or announced', async () => {
      store.runEnded(ROOT);
      dryRunAt(h, 0).resolve([dryStateOf(ID_A, 'HIT')]);
      await flush();

      expect(store.view(ROOT, PKG_A)).toBeNull();
      expect(h.changed).not.toHaveBeenCalled();
    });

    it('WHEN the run is superseded and the old one rejects with "aborted" THEN nothing is logged, nothing fails, the entry still queues', async () => {
      store.runEnded(ROOT);
      dryRunAt(h, 0).reject(new Error('aborted'));
      await flush();

      expect(h.log).not.toHaveBeenCalled();
      expect(h.changed).not.toHaveBeenCalled();

      h.fire();

      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });

    it('WHEN a second run replaced it THEN only the live run stores', async () => {
      store.runEnded(ROOT);
      h.fire();
      dryRunAt(h, 0).resolve([dryStateOf(ID_A, 'HIT')]);
      await flush();

      expect(store.view(ROOT, PKG_A)).toBeNull();

      dryRunAt(h, 1).resolve([dryStateOf(ID_A, 'MISS')]);
      await flush();

      expect(store.view(ROOT, PKG_A)?.tasks.get(ID_A)).toBe('MISS');
    });
  });

  describe('GIVEN a package that failed after it had an answer', () => {
    it('WHEN the rerun rejects THEN the old answer is gone', async () => {
      await toState(h, store, 'loaded');
      store.runEnded(ROOT);
      h.fire();
      dryRunAt(h, 1).reject(new Error('boom'));
      await flush();

      expect(store.view(ROOT, PKG_A)).toBeNull();
    });
  });

  describe('GIVEN two shown packages in one dry run', () => {
    beforeEach(() => {
      h.model(ROOT, buildModelOf([PKG_A, PKG_B]));
      store.toggled(true);
      store.packageShown(ROOT, PKG_A);
      store.packageShown(ROOT, PKG_B);
      h.fire();
    });

    it('WHEN the run rejects THEN one line lists both packages', async () => {
      dryRunAt(h, 0).reject(new Error('boom'));
      await flush();

      expect(h.log).toHaveBeenCalledExactlyOnceWith('prediction /ws @fx/a, @fx/b: boom');
      expect(h.changed).toHaveBeenCalledOnce();
    });

    it('WHEN the run settles OK THEN each package reads its own rows and the root is announced once', async () => {
      dryRunAt(h, 0).resolve([dryStateOf(ID_A, 'HIT'), dryStateOf(ID_B, 'MISS')]);
      await flush();

      expect(store.view(ROOT, PKG_A)?.tasks).toStrictEqual(new Map([[ID_A, 'HIT']]));
      expect(store.view(ROOT, PKG_B)?.tasks).toStrictEqual(new Map([[ID_B, 'MISS']]));
      expect(h.changed).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN a shown package next to one with no requested task', () => {
    beforeEach(() => {
      const persistent = turboTaskOf(PKG_B, 'dev', { persistent: true });

      h.model(ROOT, predictionModelOf({ [PKG_A]: [turboTaskOf(PKG_A, 'build')], [PKG_B]: [persistent] }));
      store.toggled(true);
      store.packageShown(ROOT, PKG_A);
      store.packageShown(ROOT, PKG_B);
      h.fire();
    });

    it('WHEN the window ends THEN the request lists only the first, the other has an empty answer and the root is announced', () => {
      expect(dryRunAt(h, 0).request.packages).toStrictEqual([PKG_A]);
      expect(store.view(ROOT, PKG_B)).toStrictEqual({ settledAt: NOW_0, tasks: new Map() });
      expect(h.changed).toHaveBeenCalledWith(ROOT);
    });

    it('WHEN the run settles THEN the one without tasks keeps its empty answer', async () => {
      dryRunAt(h, 0).resolve([dryStateOf(ID_A, 'HIT')]);
      await flush();

      expect(store.view(ROOT, PKG_B)?.tasks).toStrictEqual(new Map());
    });
  });

  describe('GIVEN a shown package with no requested task', () => {
    it('WHEN the window ends THEN no dry run spawns and the answer is empty', () => {
      h.model(ROOT, predictionModelOf({ [PKG_A]: [turboTaskOf(PKG_A, 'dev', { persistent: true })] }));
      store.toggled(true);
      store.packageShown(ROOT, PKG_A);
      h.fire();

      expect(h.dryRun).not.toHaveBeenCalled();
      expect(store.view(ROOT, PKG_A)).toStrictEqual({ settledAt: NOW_0, tasks: new Map() });
    });
  });
});
