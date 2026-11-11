import { beforeEach, describe, expect, it } from 'vitest';

import { AffectedLoads } from './affected-loads.ts';
import type { AffectedHarness, AffectedState, DeferredRead } from '../test/common/affected-load.type.ts';
import { ROOT } from '../test/common/atom-load.const.ts';
import { ID_A, PKG_A } from '../test/common/prediction-load.const.ts';
import { affectedHarness, readAt, toState } from '../test/utils/affected-load.spec.util.ts';
import { affectedResultOf } from '../test/utils/affected-result.spec.util.ts';
import { flush } from '../test/utils/atom-load.spec.util.ts';
import { changeOf } from '../test/utils/prediction-load.spec.util.ts';
import { buildModelOf } from '../test/utils/prediction-model.spec.util.ts';

type StoreAction = (store: AffectedLoads) => void;

const SHOW: StoreAction = (store): void => {
  store.rootShown(ROOT);
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
  ['rootShown arrives', SHOW],
  ['the model changes', CHANGE_MODEL],
  ['the kept roots are set', KEEP_NONE],
  ['the toggle goes off again', TOGGLE_OFF]
];

const SETTLED: AffectedState[] = ['loaded', 'failed'];

describe('FEATURE: affected loads toggle', () => {
  let h: AffectedHarness;
  let store: AffectedLoads;

  beforeEach(() => {
    h = affectedHarness();
    store = new AffectedLoads(h.ports);
  });

  describe('GIVEN the toggle is off', () => {
    it('WHEN it goes on THEN nothing spawns, nothing is announced and the root stays absent', () => {
      store.toggled(true);

      expect(h.readAffected).not.toHaveBeenCalled();
      expect(h.changed).not.toHaveBeenCalled();
      expect(store.status(ROOT)).toBe('absent');
      expect(store.view(ROOT)).toBeNull();
    });

    it.each(IGNORED)('WHEN %s THEN nothing spawns, nothing is logged and nothing is announced', (_when, act) => {
      h.model(ROOT, buildModelOf([PKG_A]));

      act(store);

      expect(h.readAffected).not.toHaveBeenCalled();
      expect(h.log).not.toHaveBeenCalled();
      expect(h.changed).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a loaded root', () => {
    it('WHEN the toggle goes on again THEN it stays loaded and nothing spawns', async () => {
      await toState(h, store, 'loaded');
      store.toggled(true);

      expect(store.status(ROOT)).toBe('loaded');
      expect(h.readAffected).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN an absent root on the wait list', () => {
    it('WHEN the toggle goes off and on and the binary arrives with a republished model THEN nothing spawns', () => {
      const same = buildModelOf([PKG_A]);

      h.model(ROOT, same);
      h.noBinary();
      store.toggled(true);
      store.rootShown(ROOT);
      store.toggled(false);
      store.toggled(true);
      h.binary();
      store.modelChanged(changeOf(same, same));

      expect(h.readAffected).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a loading root', () => {
    beforeEach(async () => {
      await toState(h, store, 'loading');
    });

    it('WHEN the toggle goes off THEN its query is aborted', () => {
      store.toggled(false);

      expect(readAt(h, 0).signal.aborted).toBe(true);
    });

    it('WHEN the toggle goes off and the query then resolves THEN nothing is stored or announced', async () => {
      store.toggled(false);
      readAt(h, 0).resolve(affectedResultOf([[ID_A, 'TaskFileChanged']]));
      await flush();

      expect(store.view(ROOT)).toBeNull();
      expect(h.changed).toHaveBeenCalledOnce();
    });

    it('WHEN the toggle goes off and the query then rejects THEN nothing is logged or announced', async () => {
      store.toggled(false);
      readAt(h, 0).reject(new Error('late'));
      await flush();

      expect(h.log).not.toHaveBeenCalled();
      expect(h.changed).toHaveBeenCalledOnce();
    });
  });

  describe.each(SETTLED)('GIVEN a %s root', (state) => {
    beforeEach(async () => {
      await toState(h, store, state);
    });

    it('WHEN the toggle goes off THEN its view is gone, it is absent and nothing is announced', () => {
      h.changed.mockClear();
      store.toggled(false);

      expect(store.view(ROOT)).toBeNull();
      expect(store.status(ROOT)).toBe('absent');
      expect(h.changed).not.toHaveBeenCalled();
    });

    it('WHEN the toggle goes off and on and the root is shown again THEN a new query spawns', () => {
      store.toggled(false);
      store.toggled(true);
      store.rootShown(ROOT);

      expect(h.readAffected).toHaveBeenCalledTimes(2);
    });
  });

  describe('GIVEN a live query', () => {
    let old: DeferredRead;

    beforeEach(async () => {
      await toState(h, store, 'loading');
      old = readAt(h, 0);
    });

    describe('WHEN the toggle goes off and on in the same tick and the old query resolves', () => {
      beforeEach(async () => {
        store.toggled(false);
        store.toggled(true);
        old.resolve(affectedResultOf([[ID_A, 'TaskFileChanged']]));
        await flush();
      });

      it('THEN the old query was aborted', () => {
        expect(old.signal.aborted).toBe(true);
      });

      it('THEN the old result never stores and the root is absent', () => {
        expect(store.view(ROOT)).toBeNull();
        expect(store.status(ROOT)).toBe('absent');
      });

      it('THEN nothing spawns and nothing is announced', () => {
        expect(h.readAffected).toHaveBeenCalledOnce();
        expect(h.changed).toHaveBeenCalledOnce();
      });

      it('THEN the next rootShown spawns one new query that stays live', () => {
        store.rootShown(ROOT);

        expect(h.readAffected).toHaveBeenCalledTimes(2);
        expect(readAt(h, 1).signal.aborted).toBe(false);
      });
    });
  });
});
