import { beforeEach, describe, expect, it } from 'vitest';

import { PredictionLoads } from './prediction-loads.ts';
import { ROOT } from '../test/common/atom-load.const.ts';
import { ID_A, PKG_A, PKG_B, PKG_C, PREDICTION_STATES, RESTARTABLE_STATES } from '../test/common/prediction-load.const.ts';
import type { PredictionHarness, PredictionState } from '../test/common/prediction-load.type.ts';
import { dryRunAt, dryStateOf, flush } from '../test/utils/atom-load.spec.util.ts';
import { changeOf, predictionHarness, toState } from '../test/utils/prediction-load.spec.util.ts';
import { buildModelOf, predictionModelOf, turboTaskOf } from '../test/utils/prediction-model.spec.util.ts';

const GONE: [PredictionState, number][] = [
  ['loading', 0],
  ['loaded', 1],
  ['failed', 0]
];

describe('FEATURE: prediction loads when the model changes', () => {
  let h: PredictionHarness;
  let store: PredictionLoads;

  beforeEach(() => {
    h = predictionHarness();
    store = new PredictionLoads(h.ports);
  });

  describe.each(PREDICTION_STATES)('GIVEN a %s package', (state) => {
    it('WHEN the model is republished as the same object THEN nothing restarts and the view stays', async () => {
      const same = buildModelOf([PKG_A]);

      await toState(h, store, state);
      const view = store.view(ROOT, PKG_A);
      const timers = h.timers.length;

      store.modelChanged(changeOf(same, same));

      expect(store.view(ROOT, PKG_A)).toStrictEqual(view);
      expect(h.timers).toHaveLength(timers);
      expect(h.dryRuns.some((run) => run.signal.aborted)).toBe(false);
    });
  });

  describe.each(RESTARTABLE_STATES)('GIVEN a %s package and a new model that still holds it', (state) => {
    beforeEach(async () => {
      await toState(h, store, state);
      store.modelChanged(changeOf(buildModelOf([PKG_A]), buildModelOf([PKG_A, PKG_B])));
    });

    it('WHEN the model arrives THEN it queues again and the old run is aborted', () => {
      expect(h.pendingTimers()).toHaveLength(1);
      expect(h.dryRuns.some((run) => run.signal.aborted)).toBe(state === 'loading');
    });

    it('WHEN the window ends THEN a new spawn starts', () => {
      h.fire();

      expect(h.dryRun).toHaveBeenCalledTimes(2);
    });
  });

  describe.each(GONE)('GIVEN a %s package', (state, announced) => {
    beforeEach(async () => {
      await toState(h, store, state);
      h.changed.mockClear();
      store.modelChanged(changeOf(buildModelOf([PKG_A]), buildModelOf([PKG_B])));
    });

    it('WHEN a new model lacks it THEN it is absent and announced only if it had an answer', () => {
      expect(store.view(ROOT, PKG_A)).toBeNull();
      expect(h.changed).toHaveBeenCalledTimes(announced);
    });

    it('WHEN a new model lacks it THEN a later packageShown queues it again', () => {
      store.packageShown(ROOT, PKG_A);

      expect(h.pendingTimers()).toHaveLength(1);
    });
  });

  describe('GIVEN a queued package', () => {
    it('WHEN a new model arrives THEN it is kept and the request is built from the current model at the send', async () => {
      await toState(h, store, 'queued');
      const next = predictionModelOf({ [PKG_A]: [turboTaskOf(PKG_A, 'build'), turboTaskOf(PKG_A, 'lint')] });

      h.model(ROOT, next);
      store.modelChanged(changeOf(buildModelOf([PKG_A]), next));
      h.fire();

      expect(h.dryRun).toHaveBeenCalledOnce();
      expect(dryRunAt(h, 0).request.tasks).toStrictEqual(['build', 'lint']);
    });
  });

  describe('GIVEN Queued WHEN a new model drops the package and the window ends', () => {
    beforeEach(async () => {
      await toState(h, store, 'queued');
      h.model(ROOT, buildModelOf([PKG_B]));
      store.modelChanged(changeOf(buildModelOf([PKG_A]), buildModelOf([PKG_B])));
      h.fire();
    });

    it('THEN it is Absent and nothing is announced', () => {
      expect(store.view(ROOT, PKG_A)).toBeNull();
      expect(h.changed).not.toHaveBeenCalled();
    });

    it('THEN a later packageShown queues it again', () => {
      store.packageShown(ROOT, PKG_A);

      expect(h.pendingTimers()).toHaveLength(1);
    });
  });

  describe('GIVEN a loaded package queued again WHEN a new model drops it and the window ends', () => {
    beforeEach(async () => {
      await toState(h, store, 'loaded');
      store.refreshAll();
      h.changed.mockClear();
      h.model(ROOT, buildModelOf([PKG_B]));
      store.modelChanged(changeOf(buildModelOf([PKG_A]), buildModelOf([PKG_B])));
      h.fire();
    });

    it('THEN it is Absent', () => {
      expect(store.view(ROOT, PKG_A)).toBeNull();
    });

    it('THEN the answer it took back is announced once', () => {
      expect(h.changed).toHaveBeenCalledExactlyOnceWith(ROOT, new Set([PKG_A]));
    });
  });

  describe('GIVEN an absent package', () => {
    it('WHEN a new model arrives THEN no timer starts', () => {
      store.toggled(true);
      store.modelChanged(changeOf(null, buildModelOf([PKG_A])));

      expect(h.timers).toStrictEqual([]);
    });
  });

  describe('GIVEN a loaded package that was renamed', () => {
    it('WHEN the new model holds the new name THEN the old name is absent and the new one is not asked', async () => {
      await toState(h, store, 'loaded');
      store.modelChanged(changeOf(buildModelOf([PKG_A]), buildModelOf([PKG_C])));

      expect(store.view(ROOT, PKG_A)).toBeNull();
      expect(store.view(ROOT, PKG_C)).toBeNull();
      expect(h.pendingTimers()).toStrictEqual([]);
    });
  });

  describe('GIVEN two packages in one live dry run', () => {
    beforeEach(() => {
      h.model(ROOT, buildModelOf([PKG_A, PKG_B]));
      store.toggled(true);
      store.packageShown(ROOT, PKG_A);
      store.packageShown(ROOT, PKG_B);
      h.fire();
      store.modelChanged(changeOf(buildModelOf([PKG_A, PKG_B]), buildModelOf([PKG_B])));
    });

    it('WHEN a reload drops one THEN it is absent, the other queues and the old run is aborted', () => {
      expect(store.view(ROOT, PKG_A)).toBeNull();
      expect(dryRunAt(h, 0).signal.aborted).toBe(true);
      expect(h.pendingTimers()).toHaveLength(1);
    });

    describe('GIVEN the old run then resolves', () => {
      beforeEach(async () => {
        dryRunAt(h, 0).resolve([dryStateOf(ID_A, 'HIT')]);
        await flush();
      });

      it('WHEN it settles THEN nothing is stored or announced', () => {
        expect(store.view(ROOT, PKG_A)).toBeNull();
        expect(h.changed).not.toHaveBeenCalled();
      });

      it('WHEN the window ends THEN the next spawn asks only for the other', () => {
        h.model(ROOT, buildModelOf([PKG_B]));
        h.fire();

        expect(h.dryRun).toHaveBeenCalledTimes(2);
        expect(dryRunAt(h, 1).request.packages).toStrictEqual([PKG_B]);
      });
    });
  });
});
