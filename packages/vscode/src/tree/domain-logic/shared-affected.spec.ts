import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { sharedAffectedOf } from './shared-affected.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { AffectedListener, SharedAffected } from '../common/affected.type.ts';
import type { AffectedHarness } from '../test/common/affected-load.type.ts';
import { ROOT } from '../test/common/atom-load.const.ts';
import { ID_A, PKG_A } from '../test/common/prediction-load.const.ts';
import { ROOT_FOLDER_STUB } from '../test/stubs/root-state.stub.ts';
import { affectedHarness, readAt } from '../test/utils/affected-load.spec.util.ts';
import { affectedResultOf } from '../test/utils/affected-result.spec.util.ts';
import { flush } from '../test/utils/atom-load.spec.util.ts';
import { loadedOf } from '../test/utils/atom-tree.spec.util.ts';
import { changeOf } from '../test/utils/prediction-load.spec.util.ts';
import { buildModelOf } from '../test/utils/prediction-model.spec.util.ts';

describe('FEATURE: shared affected', () => {
  let h: AffectedHarness;
  let store: RootStore;
  let affected: SharedAffected;

  const showRoot = (): void => {
    affected.toggled(true);
    affected.rootShown(ROOT);
  };

  const settleRead = async (): Promise<void> => {
    readAt(h, 0).resolve(affectedResultOf([[ID_A, 'TaskFileChanged']]));
    await flush();
  };

  beforeEach(() => {
    h = affectedHarness();
    store = new RootStore();
    store.set([ROOT_FOLDER_STUB], coordinatorMock);
    store.apply(ROOT, loadedOf(buildModelOf([PKG_A])));
    affected = sharedAffectedOf(store, h.ports);
  });

  describe('GIVEN a loading root and two subscribed listeners', () => {
    let first: Mock<AffectedListener>;
    let second: Mock<AffectedListener>;

    beforeEach(() => {
      showRoot();
      first = vi.fn<AffectedListener>();
      second = vi.fn<AffectedListener>();
      affected.onDidChange(first);
      affected.onDidChange(second);
    });

    it('WHEN the query settles THEN the first listener hears the root once', async () => {
      await settleRead();

      expect(first).toHaveBeenCalledExactlyOnceWith(ROOT);
    });

    it('WHEN the query settles THEN the second listener hears the root once', async () => {
      await settleRead();

      expect(second).toHaveBeenCalledExactlyOnceWith(ROOT);
    });

    it('WHEN disposed THEN the live query is aborted and a settling result reaches no listener', async () => {
      affected.dispose();
      await settleRead();

      expect(readAt(h, 0).signal.aborted).toBe(true);
      expect(first).not.toHaveBeenCalled();
      expect(second).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a first listener that throws and a second listener', () => {
    let second: Mock<AffectedListener>;

    beforeEach(() => {
      const first = vi.fn<AffectedListener>(() => {
        throw new Error('boom');
      });

      showRoot();
      second = vi.fn<AffectedListener>();
      affected.onDidChange(first);
      affected.onDidChange(second);
    });

    it('WHEN the query settles THEN the second listener still hears the root once', async () => {
      await settleRead();

      expect(second).toHaveBeenCalledExactlyOnceWith(ROOT);
    });

    it('WHEN the query settles THEN the log names the root and the error', async () => {
      await settleRead();

      expect(h.log).toHaveBeenCalledExactlyOnceWith(`affected ${ROOT}: listener failed: boom`);
    });
  });

  describe('GIVEN a listener that unsubscribed', () => {
    it('WHEN the query settles THEN it hears nothing', async () => {
      const listener = vi.fn<AffectedListener>();
      const off = affected.onDidChange(listener);

      off();
      showRoot();
      await settleRead();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a store disposed', () => {
    it('WHEN the toggle turns on and a root is shown THEN no query starts', () => {
      affected.dispose();
      showRoot();

      expect(h.reads).toHaveLength(0);
    });
  });

  describe('GIVEN a root that waits for a binary', () => {
    it('WHEN modelChanged is called THEN the store receives the change and the query starts', () => {
      h.noBinary();
      showRoot();
      h.binary();
      affected.modelChanged(changeOf(null, buildModelOf([PKG_A])));

      expect(h.reads).toHaveLength(1);
    });
  });

  describe('GIVEN a loaded root', () => {
    beforeEach(async () => {
      showRoot();
      await settleRead();
    });

    it('WHEN refreshAll is called THEN the root queries again', () => {
      affected.refreshAll();

      expect(h.reads).toHaveLength(2);
    });

    it('WHEN rootsKept drops the root THEN it reads as absent', () => {
      affected.rootsKept(new Set());

      expect(affected.status(ROOT)).toBe('absent');
    });

    it('WHEN rootsKept drops a root with a live query THEN the query is aborted', () => {
      affected.refreshAll();
      affected.rootsKept(new Set());

      expect(readAt(h, 1).signal.aborted).toBe(true);
    });
  });

  describe('GIVEN a root never shown', () => {
    it('WHEN view and status are read THEN they are null and absent', () => {
      expect(affected.view(ROOT)).toBeNull();
      expect(affected.status(ROOT)).toBe('absent');
    });
  });

  describe('GIVEN a settled root', () => {
    it('WHEN view and status are read THEN they are the loaded view and loaded', async () => {
      showRoot();
      await settleRead();

      expect(affected.status(ROOT)).toBe('loaded');
      expect(affected.view(ROOT)?.tasks.get(ID_A)?.mark).toBe('changed');
    });
  });
});
