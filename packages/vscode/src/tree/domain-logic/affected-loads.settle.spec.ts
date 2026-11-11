import { beforeEach, describe, expect, it } from 'vitest';

import { AffectedLoads } from './affected-loads.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import type { AffectedView } from '../common/affected.type.ts';
import type { AffectedHarness } from '../test/common/affected-load.type.ts';
import { ROOT } from '../test/common/atom-load.const.ts';
import { ID_A, ID_B, NOW_1, PKG_B } from '../test/common/prediction-load.const.ts';
import { affectedHarness, readAt, toState } from '../test/utils/affected-load.spec.util.ts';
import { affectedResultOf } from '../test/utils/affected-result.spec.util.ts';
import { flush } from '../test/utils/atom-load.spec.util.ts';
import { buildModelOf } from '../test/utils/prediction-model.spec.util.ts';

const loadedViewOf = (store: AffectedLoads): AffectedView => {
  const view = store.view(ROOT);

  if (view === null) throw new Error('no view');

  return view;
};

const taskIdsOf = (view: AffectedView): string[] => {
  const ids = view.tasks.keys();

  return [...ids];
};

describe('FEATURE: affected loads settling', () => {
  let h: AffectedHarness;
  let store: AffectedLoads;

  beforeEach(() => {
    h = affectedHarness();
    store = new AffectedLoads(h.ports);
  });

  describe('GIVEN a loading root', () => {
    beforeEach(async () => {
      await toState(h, store, 'loading');
    });

    it('WHEN the query settles at NOW_1 THEN it is loaded, the view holds only kept tasks with the settle time and mode, changed fires once more', async () => {
      h.setNow(NOW_1);
      readAt(h, 0).resolve(
        affectedResultOf(
          [
            [ID_A, 'TaskFileChanged'],
            ['@fx/gone#build', 'TaskFileChanged']
          ],
          'task'
        )
      );
      await flush();

      expect(store.status(ROOT)).toBe('loaded');
      expect(loadedViewOf(store).settledAt).toBe(NOW_1);
      expect(loadedViewOf(store).mode).toBe('task');
      expect(taskIdsOf(loadedViewOf(store))).toStrictEqual([ID_A]);
      expect(h.changed).toHaveBeenCalledTimes(2);
      expect(h.changed).toHaveBeenLastCalledWith(ROOT);
    });

    it('WHEN the model changes before the query settles THEN the view is built over the model of the settle', async () => {
      h.model(ROOT, buildModelOf([PKG_B]));
      readAt(h, 0).resolve(
        affectedResultOf([
          [ID_A, 'TaskFileChanged'],
          [ID_B, 'TaskFileChanged']
        ])
      );
      await flush();

      expect(taskIdsOf(loadedViewOf(store))).toStrictEqual([ID_B]);
    });

    it('WHEN the model is gone at the settle THEN it is loaded with no tasks, the settle time and the mode of the result', async () => {
      h.model(ROOT, null);
      h.setNow(NOW_1);
      readAt(h, 0).resolve(affectedResultOf([[ID_A, 'TaskFileChanged']], 'package'));
      await flush();

      expect(store.status(ROOT)).toBe('loaded');
      expect(loadedViewOf(store).tasks.size).toBe(0);
      expect(loadedViewOf(store).settledAt).toBe(NOW_1);
      expect(loadedViewOf(store).mode).toBe('package');
    });

    it('WHEN a package-mode result settles THEN the view mode is package', async () => {
      readAt(h, 0).resolve(affectedResultOf([[ID_A, 'TaskFileChanged']], 'package'));
      await flush();

      expect(loadedViewOf(store).mode).toBe('package');
    });

    it('WHEN the binary vanishes after the spawn and the query settles THEN it is loaded and the spawn had the binary', async () => {
      h.noBinary();
      readAt(h, 0).resolve(affectedResultOf([[ID_A, 'TaskFileChanged']]));
      await flush();

      expect(readAt(h, 0).binary).toBe(TURBO_BINARY_STUB);
      expect(store.status(ROOT)).toBe('loaded');
    });

    it('WHEN the query rejects THEN it is failed with no view, one Output line, and changed fires once more', async () => {
      readAt(h, 0).reject(new Error('boom'));
      await flush();

      expect(store.status(ROOT)).toBe('failed');
      expect(store.view(ROOT)).toBeNull();
      expect(h.log).toHaveBeenCalledExactlyOnceWith('affected /ws: boom');
      expect(h.changed).toHaveBeenCalledTimes(2);
    });
  });

  describe('GIVEN a refresh that superseded the query', () => {
    beforeEach(async () => {
      await toState(h, store, 'loading');
      store.refreshAll();
    });

    it('WHEN the old query resolves THEN only the new result stores', async () => {
      readAt(h, 0).resolve(affectedResultOf([[ID_A, 'TaskFileChanged']]));
      await flush();

      expect(store.view(ROOT)).toBeNull();
      expect(store.status(ROOT)).toBe('loading');

      readAt(h, 1).resolve(affectedResultOf([[ID_A, 'TaskPackageDependencyChanged']]));
      await flush();

      expect(loadedViewOf(store).tasks.get(ID_A)?.mark).toBe('dependency');
    });

    it('WHEN the old query rejects with a plain error THEN nothing is logged, it stays loading and changed is unchanged', async () => {
      const announced = h.changed.mock.calls.length;

      readAt(h, 0).reject(new Error('stale'));
      await flush();

      expect(h.log).not.toHaveBeenCalled();
      expect(store.status(ROOT)).toBe('loading');
      expect(h.changed).toHaveBeenCalledTimes(announced);
    });

    it('WHEN the old query rejects as aborted THEN nothing is logged, it stays loading and changed is unchanged', async () => {
      const announced = h.changed.mock.calls.length;

      readAt(h, 0).reject(new Error('aborted'));
      await flush();

      expect(h.log).not.toHaveBeenCalled();
      expect(store.status(ROOT)).toBe('loading');
      expect(h.changed).toHaveBeenCalledTimes(announced);
    });
  });

  describe('GIVEN a loaded root that refreshes', () => {
    it('WHEN the new query rejects THEN the old result is dropped', async () => {
      await toState(h, store, 'loaded');
      store.refreshAll();
      readAt(h, 1).reject(new Error('boom'));
      await flush();

      expect(store.status(ROOT)).toBe('failed');
      expect(store.view(ROOT)).toBeNull();
    });
  });
});
