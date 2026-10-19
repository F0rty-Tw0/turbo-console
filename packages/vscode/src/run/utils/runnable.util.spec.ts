import type { TurboBinary } from '@turbo-console/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { whenRunnable } from './runnable.util.ts';
import type { Coordinator, RootChange, RootEntry, RootState, Roots } from '../../roots/common/coordinator.type.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import { flushSettles, settledFlag } from '../../roots/test/utils/deferred-ports.spec.util.ts';
import { ROOT_STATE_STUB } from '../../tree/test/stubs/root-state.stub.ts';

const CHANGE: RootChange = { root: '/ws', before: null, after: null, errorBefore: null, errorAfter: null };

describe('FEATURE: wait until a root can run a task', () => {
  let binary: TurboBinary | null;
  let listeners: Set<(change: RootChange) => void>;
  let roots: Roots;
  let coordinator: Coordinator;

  /** Sets the binary every root reads, then tells the listeners `root` changed. */
  const changed = (root: string, next: TurboBinary | null): void => {
    const change: RootChange = { ...CHANGE, root };

    binary = next;

    for (const listener of listeners) listener(change);
  };

  beforeEach(() => {
    binary = null;
    listeners = new Set();
    coordinator = coordinatorMock();

    const get = (): RootEntry => {
      const state: RootState = { ...ROOT_STATE_STUB, binary };
      const entry: RootEntry = { state, coordinator };

      return entry;
    };
    const onDidChange: Roots['onDidChange'] = (listener) => {
      listeners.add(listener);

      return (): void => {
        listeners.delete(listener);
      };
    };

    roots = { get, all: (): RootEntry[] => [], onDidChange };
  });

  describe('GIVEN a load that never settles', () => {
    let isRunnable: () => boolean;

    beforeEach(() => {
      vi.mocked(coordinator.whenSettled).mockReturnValue(new Promise(() => undefined));
      isRunnable = settledFlag(whenRunnable(roots, '/ws', coordinator));
    });

    describe('WHEN the root gets a binary', () => {
      beforeEach(async () => {
        changed('/ws', TURBO_BINARY_STUB);
        await flushSettles();
      });

      it('THEN it resolves', () => {
        expect(isRunnable()).toBe(true);
      });

      it('THEN its listener is removed', () => {
        expect(listeners.size).toBe(0);
      });
    });

    it('WHEN another root gets its binary THEN it keeps waiting', async () => {
      changed('/other', TURBO_BINARY_STUB);
      await flushSettles();

      expect(isRunnable()).toBe(false);
    });

    it('WHEN the root changes with no binary THEN it keeps waiting', async () => {
      changed('/ws', null);
      await flushSettles();

      expect(isRunnable()).toBe(false);
    });
  });

  describe('GIVEN a load that settles with no binary', () => {
    describe('WHEN waited on', () => {
      beforeEach(async () => {
        await whenRunnable(roots, '/ws', coordinator);
      });

      it('THEN it waits for that settle', () => {
        expect(coordinator.whenSettled).toHaveBeenCalledOnce();
      });

      it('THEN its listener is removed', () => {
        expect(listeners.size).toBe(0);
      });
    });
  });
});
