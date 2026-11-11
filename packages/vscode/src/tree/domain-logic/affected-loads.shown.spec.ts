import { beforeEach, describe, expect, it } from 'vitest';

import { AffectedLoads } from './affected-loads.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import type { AffectedHarness, AffectedState } from '../test/common/affected-load.type.ts';
import { OTHER_ROOT, ROOT } from '../test/common/atom-load.const.ts';
import { PKG_A, PKG_B } from '../test/common/prediction-load.const.ts';
import { affectedHarness, readAt, toState } from '../test/utils/affected-load.spec.util.ts';
import { affectedResultOf } from '../test/utils/affected-result.spec.util.ts';
import { flush } from '../test/utils/atom-load.spec.util.ts';
import { changeOf } from '../test/utils/prediction-load.spec.util.ts';
import { buildModelOf } from '../test/utils/prediction-model.spec.util.ts';

const REASKS = [1, 2, 3, 4, 5];

const STATES: AffectedState[] = ['loading', 'loaded', 'failed'];

describe('FEATURE: affected loads when a root is shown', () => {
  let h: AffectedHarness;
  let store: AffectedLoads;

  beforeEach(() => {
    h = affectedHarness();
    store = new AffectedLoads(h.ports);
  });

  describe('GIVEN an absent root', () => {
    beforeEach(() => {
      h.model(ROOT, buildModelOf([PKG_A]));
      store.toggled(true);
      store.rootShown(ROOT);
    });

    it('WHEN it is shown THEN one query spawns with the binary and an abort signal', () => {
      expect(h.readAffected).toHaveBeenCalledExactlyOnceWith(TURBO_BINARY_STUB, expect.any(AbortSignal));
    });

    it('WHEN it is shown THEN it is loading with no view and changed fires once with the root', () => {
      expect(store.status(ROOT)).toBe('loading');
      expect(store.view(ROOT)).toBeNull();
      expect(h.changed).toHaveBeenCalledExactlyOnceWith(ROOT);
    });
  });

  describe('GIVEN a root already asked', () => {
    it.each(STATES)('WHEN a %s root is shown again THEN there is no second spawn and no extra changed', async (state) => {
      await toState(h, store, state);
      const announced = h.changed.mock.calls.length;

      store.rootShown(ROOT);

      expect(h.readAffected).toHaveBeenCalledOnce();
      expect(h.changed).toHaveBeenCalledTimes(announced);
    });

    it('WHEN a failed root is shown and every change re-asks (the tree does) THEN exactly one spawn and it stays failed', async () => {
      h.changed.mockImplementation(() => {
        store.rootShown(ROOT);
      });
      await toState(h, store, 'failed');
      REASKS.forEach(() => {
        store.rootShown(ROOT);
      });

      expect(h.readAffected).toHaveBeenCalledOnce();
      expect(store.status(ROOT)).toBe('failed');
    });
  });

  describe('GIVEN a root with no turbo binary', () => {
    beforeEach(() => {
      h.model(ROOT, buildModelOf([PKG_A]));
      h.noBinary();
      store.toggled(true);
      store.rootShown(ROOT);
    });

    it('WHEN it is shown THEN nothing spawns, nothing is announced and it stays absent', () => {
      expect(h.readAffected).not.toHaveBeenCalled();
      expect(h.changed).not.toHaveBeenCalled();
      expect(store.status(ROOT)).toBe('absent');
    });

    it('WHEN the binary arrives with a republished model of the same object THEN one query spawns and changed fires once', () => {
      const same = buildModelOf([PKG_A]);

      h.binary();
      store.modelChanged(changeOf(same, same));

      expect(h.readAffected).toHaveBeenCalledOnce();
      expect(h.changed).toHaveBeenCalledExactlyOnceWith(ROOT);
    });

    it('WHEN the model changes with still no binary and then the binary arrives THEN it spawns at the second change only', () => {
      store.modelChanged(changeOf(null, buildModelOf([PKG_A])));

      expect(h.readAffected).not.toHaveBeenCalled();

      h.binary();
      store.modelChanged(changeOf(null, buildModelOf([PKG_B])));

      expect(h.readAffected).toHaveBeenCalledOnce();
    });

    it('WHEN the wait list started a query and the same model is republished THEN there is no second spawn', () => {
      const same = buildModelOf([PKG_A]);

      h.binary();
      store.modelChanged(changeOf(same, same));
      store.modelChanged(changeOf(same, same));

      expect(h.readAffected).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN two shown roots', () => {
    beforeEach(() => {
      h.model(ROOT, buildModelOf([PKG_A]));
      h.model(OTHER_ROOT, buildModelOf([PKG_A]));
      store.toggled(true);
      store.rootShown(ROOT);
      store.rootShown(OTHER_ROOT);
    });

    it('WHEN both are shown THEN each spawns once and both are loading', () => {
      expect(h.readAffected).toHaveBeenCalledTimes(2);
      expect(store.status(ROOT)).toBe('loading');
      expect(store.status(OTHER_ROOT)).toBe('loading');
    });

    it('WHEN one settles THEN the other stays loading', async () => {
      readAt(h, 0).resolve(affectedResultOf([]));
      await flush();

      expect(store.status(ROOT)).toBe('loaded');
      expect(store.status(OTHER_ROOT)).toBe('loading');
    });
  });
});
