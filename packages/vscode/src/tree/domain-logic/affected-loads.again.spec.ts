import { beforeEach, describe, expect, it } from 'vitest';

import { AffectedLoads } from './affected-loads.ts';
import type { AffectedHarness, AffectedState } from '../test/common/affected-load.type.ts';
import { OTHER_ROOT, ROOT } from '../test/common/atom-load.const.ts';
import { ID_A, PKG_A, PKG_B } from '../test/common/prediction-load.const.ts';
import { affectedHarness, readAt, toState } from '../test/utils/affected-load.spec.util.ts';
import { affectedResultOf } from '../test/utils/affected-result.spec.util.ts';
import { flush } from '../test/utils/atom-load.spec.util.ts';
import { changeOf } from '../test/utils/prediction-load.spec.util.ts';
import { buildModelOf } from '../test/utils/prediction-model.spec.util.ts';

const STATES: AffectedState[] = ['loading', 'loaded', 'failed'];

const SETTLED: [AffectedState, boolean][] = [
  ['loaded', true],
  ['failed', false]
];

const NEW_MODEL = (): ReturnType<typeof changeOf> => changeOf(buildModelOf([PKG_A]), buildModelOf([PKG_A, PKG_B]));

describe('FEATURE: affected loads asking again', () => {
  let h: AffectedHarness;
  let store: AffectedLoads;

  beforeEach(() => {
    h = affectedHarness();
    store = new AffectedLoads(h.ports);
  });

  describe('GIVEN an absent root that is not waiting', () => {
    beforeEach(() => {
      store.toggled(true);
    });

    it('WHEN a new model arrives THEN it is ignored: no spawn, no changed', () => {
      store.modelChanged(NEW_MODEL());

      expect(h.readAffected).not.toHaveBeenCalled();
      expect(h.changed).not.toHaveBeenCalled();
    });

    it('WHEN everything refreshes THEN it is ignored', () => {
      store.refreshAll();

      expect(h.readAffected).not.toHaveBeenCalled();
      expect(h.changed).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN an absent root on the wait list', () => {
    it('WHEN a new model arrives with a binary THEN it leaves the list, loads and changed fires once', () => {
      h.model(ROOT, buildModelOf([PKG_A]));
      h.noBinary();
      store.toggled(true);
      store.rootShown(ROOT);
      h.binary();
      store.modelChanged(NEW_MODEL());

      expect(store.status(ROOT)).toBe('loading');
      expect(h.readAffected).toHaveBeenCalledOnce();
      expect(h.changed).toHaveBeenCalledExactlyOnceWith(ROOT);
    });
  });

  describe('GIVEN a loading root', () => {
    beforeEach(async () => {
      await toState(h, store, 'loading');
    });

    it('WHEN a new model arrives THEN the old query is aborted, a second spawns and changed is not called again', () => {
      store.modelChanged(NEW_MODEL());

      expect(readAt(h, 0).signal.aborted).toBe(true);
      expect(h.readAffected).toHaveBeenCalledTimes(2);
      expect(h.changed).toHaveBeenCalledOnce();
    });

    it('WHEN everything refreshes THEN the old query is aborted, a second spawns and changed is not called again', () => {
      store.refreshAll();

      expect(readAt(h, 0).signal.aborted).toBe(true);
      expect(h.readAffected).toHaveBeenCalledTimes(2);
      expect(h.changed).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN a loading root that refreshed twice', () => {
    beforeEach(async () => {
      await toState(h, store, 'loading');
      store.refreshAll();
      store.refreshAll();
    });

    it('WHEN the earlier queries are checked THEN each one is aborted', () => {
      expect(readAt(h, 0).signal.aborted).toBe(true);
      expect(readAt(h, 1).signal.aborted).toBe(true);
    });

    it('WHEN the two earlier queries resolve THEN nothing is stored', async () => {
      readAt(h, 0).resolve(affectedResultOf([[ID_A, 'TaskFileChanged']]));
      readAt(h, 1).resolve(affectedResultOf([[ID_A, 'TaskFileChanged']]));
      await flush();

      expect(store.view(ROOT)).toBeNull();
    });

    it('WHEN the last query resolves THEN its result stores', async () => {
      readAt(h, 2).resolve(affectedResultOf([[ID_A, 'TaskPackageDependencyChanged']]));
      await flush();

      expect(store.view(ROOT)?.tasks.get(ID_A)?.mark).toBe('dependency');
    });
  });

  describe.each(SETTLED)('GIVEN a %s root', (state, keepsView) => {
    beforeEach(async () => {
      await toState(h, store, state);
      h.changed.mockClear();
    });

    it('WHEN a new model arrives THEN it is loading, the view is kept only if loaded, changed fires once and a second spawn runs', () => {
      store.modelChanged(NEW_MODEL());

      expect(store.status(ROOT)).toBe('loading');
      expect(store.view(ROOT)?.tasks.has(ID_A) ?? false).toBe(keepsView);
      expect(h.changed).toHaveBeenCalledExactlyOnceWith(ROOT);
      expect(h.readAffected).toHaveBeenCalledTimes(2);
    });

    it('WHEN everything refreshes THEN it is loading, the view is kept only if loaded, changed fires once and a second spawn runs', () => {
      store.refreshAll();

      expect(store.status(ROOT)).toBe('loading');
      expect(store.view(ROOT)?.tasks.has(ID_A) ?? false).toBe(keepsView);
      expect(h.changed).toHaveBeenCalledExactlyOnceWith(ROOT);
      expect(h.readAffected).toHaveBeenCalledTimes(2);
    });
  });

  describe.each(STATES)('GIVEN a %s root', (state) => {
    beforeEach(async () => {
      await toState(h, store, state);
      h.changed.mockClear();
    });

    it('WHEN the same model is republished THEN nothing aborts, spawns or is announced', () => {
      const same = buildModelOf([PKG_A]);

      store.modelChanged(changeOf(same, same));

      expect(readAt(h, 0).signal.aborted).toBe(false);
      expect(h.readAffected).toHaveBeenCalledOnce();
      expect(h.changed).not.toHaveBeenCalled();
    });

    it('WHEN the model of another root changes THEN this root is untouched', () => {
      store.modelChanged(changeOf(buildModelOf([PKG_A]), buildModelOf([PKG_B]), OTHER_ROOT));

      expect(h.readAffected).toHaveBeenCalledOnce();
      expect(h.changed).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN two settled roots', () => {
    beforeEach(async () => {
      h.model(OTHER_ROOT, buildModelOf([PKG_A]));
      await toState(h, store, 'loading');
      store.rootShown(OTHER_ROOT);
      readAt(h, 0).resolve(affectedResultOf([]));
      readAt(h, 1).resolve(affectedResultOf([]));
      await flush();
    });

    it('WHEN everything refreshes THEN each root gets exactly one new query, still live', () => {
      store.refreshAll();

      const aborted = h.reads.map((read) => read.signal.aborted);

      expect(aborted).toStrictEqual([false, false, false, false]);
      expect([store.status(ROOT), store.status(OTHER_ROOT)]).toStrictEqual(['loading', 'loading']);
    });
  });

  describe('GIVEN a root whose change announcement shows another root', () => {
    it('WHEN everything refreshes THEN the root shown meanwhile spawns once and is not restarted', async () => {
      h.model(OTHER_ROOT, buildModelOf([PKG_A]));
      await toState(h, store, 'loaded');
      h.changed.mockImplementationOnce(() => {
        store.rootShown(OTHER_ROOT);
      });

      store.refreshAll();

      expect(h.readAffected).toHaveBeenCalledTimes(3);
    });
  });

  describe('GIVEN a loaded root whose binary vanished', () => {
    beforeEach(async () => {
      await toState(h, store, 'loaded');
      h.changed.mockClear();
      h.noBinary();
      store.refreshAll();
    });

    it('WHEN everything refreshes THEN nothing spawns, it is absent and changed fires once', () => {
      expect(h.readAffected).toHaveBeenCalledOnce();
      expect(store.status(ROOT)).toBe('absent');
      expect(h.changed).toHaveBeenCalledExactlyOnceWith(ROOT);
    });

    it('WHEN the binary returns with a republished model THEN it spawns again', () => {
      const same = buildModelOf([PKG_A]);

      h.binary();
      store.modelChanged(changeOf(same, same));

      expect(h.readAffected).toHaveBeenCalledTimes(2);
      expect(store.status(ROOT)).toBe('loading');
    });
  });

  describe('GIVEN a loading root whose binary vanished', () => {
    beforeEach(async () => {
      await toState(h, store, 'loading');
      h.changed.mockClear();
      h.noBinary();
      store.refreshAll();
    });

    it('WHEN everything refreshes THEN it is absent', () => {
      expect(store.status(ROOT)).toBe('absent');
    });

    it('WHEN everything refreshes THEN changed fires once', () => {
      expect(h.changed).toHaveBeenCalledExactlyOnceWith(ROOT);
    });
  });
});
