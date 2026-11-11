import { beforeEach, describe, expect, it } from 'vitest';

import { AffectedLoads } from './affected-loads.ts';
import type { AffectedHarness, AffectedState } from '../test/common/affected-load.type.ts';
import { OTHER_ROOT, ROOT } from '../test/common/atom-load.const.ts';
import { ID_A, PKG_A } from '../test/common/prediction-load.const.ts';
import { affectedHarness, readAt, toState } from '../test/utils/affected-load.spec.util.ts';
import { affectedResultOf } from '../test/utils/affected-result.spec.util.ts';
import { flush } from '../test/utils/atom-load.spec.util.ts';
import { changeOf } from '../test/utils/prediction-load.spec.util.ts';
import { buildModelOf } from '../test/utils/prediction-model.spec.util.ts';

const STATES: AffectedState[] = ['loading', 'loaded', 'failed'];

describe('FEATURE: affected loads when roots go away', () => {
  let h: AffectedHarness;
  let store: AffectedLoads;

  beforeEach(() => {
    h = affectedHarness();
    store = new AffectedLoads(h.ports);
  });

  describe.each(STATES)('GIVEN a %s root', (state) => {
    beforeEach(async () => {
      await toState(h, store, state);
      h.changed.mockClear();
    });

    it('WHEN the root is no longer kept THEN it is absent with no view, nothing is announced and a live query is aborted', () => {
      store.rootsKept(new Set());

      expect(store.status(ROOT)).toBe('absent');
      expect(store.view(ROOT)).toBeNull();
      expect(h.changed).not.toHaveBeenCalled();
      expect(readAt(h, 0).signal.aborted).toBe(state === 'loading');
    });
  });

  describe('GIVEN two loading roots', () => {
    it('WHEN only one is kept THEN only the dropped root changes', () => {
      h.model(OTHER_ROOT, buildModelOf([PKG_A]));
      h.model(ROOT, buildModelOf([PKG_A]));
      store.toggled(true);
      store.rootShown(ROOT);
      store.rootShown(OTHER_ROOT);
      store.rootsKept(new Set([ROOT]));

      expect(store.status(ROOT)).toBe('loading');
      expect(store.status(OTHER_ROOT)).toBe('absent');
      expect(readAt(h, 0).signal.aborted).toBe(false);
      expect(readAt(h, 1).signal.aborted).toBe(true);
    });
  });

  describe('GIVEN a removed root on the wait list', () => {
    it('WHEN the binary arrives and the model is republished THEN nothing spawns', () => {
      const same = buildModelOf([PKG_A]);

      h.model(ROOT, same);
      h.noBinary();
      store.toggled(true);
      store.rootShown(ROOT);
      store.rootsKept(new Set());
      h.binary();
      store.modelChanged(changeOf(same, same));

      expect(h.readAffected).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a kept root on the wait list', () => {
    it('WHEN the binary arrives and the model is republished THEN it spawns once', () => {
      const same = buildModelOf([PKG_A]);

      h.model(ROOT, same);
      h.noBinary();
      store.toggled(true);
      store.rootShown(ROOT);
      store.rootsKept(new Set([ROOT]));
      h.binary();
      store.modelChanged(changeOf(same, same));

      expect(h.readAffected).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN a disposed store with a live query', () => {
    beforeEach(async () => {
      await toState(h, store, 'loading');
      h.changed.mockClear();
      store.dispose();
    });

    it('WHEN the query is then settled THEN its signal was aborted and neither changed nor log is called', async () => {
      readAt(h, 0).resolve(affectedResultOf([[ID_A, 'TaskFileChanged']]));
      await flush();

      expect(readAt(h, 0).signal.aborted).toBe(true);
      expect(h.changed).not.toHaveBeenCalled();
      expect(h.log).not.toHaveBeenCalled();
    });

    it('WHEN the query then rejects THEN neither changed nor log is called', async () => {
      readAt(h, 0).reject(new Error('late'));
      await flush();

      expect(h.changed).not.toHaveBeenCalled();
      expect(h.log).not.toHaveBeenCalled();
    });

    it('WHEN the root is shown, the toggle goes on and everything refreshes THEN nothing spawns', () => {
      store.rootShown(ROOT);
      store.toggled(true);
      store.rootShown(ROOT);
      store.refreshAll();

      expect(h.readAffected).toHaveBeenCalledOnce();
    });
  });
});
