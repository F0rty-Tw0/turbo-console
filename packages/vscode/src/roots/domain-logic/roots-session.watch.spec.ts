import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RootsSession } from './roots-session.ts';
import { DEBOUNCE_MS } from '../../watch/common/watch.const.ts';
import type { LoadDeps, RootFolder } from '../common/root.type.ts';
import { stateOf } from '../test/utils/promise-state.spec.util.ts';
import { sessionPortsWith } from '../test/utils/session-ports.spec.util.ts';

const A_FOLDER: RootFolder = { root: '/a', name: 'a' };

const noCache = (): LoadDeps['readCached'] => vi.fn().mockResolvedValue(null);

describe('FEATURE: roots session watcher changes', () => {
  describe('GIVEN a shown root a watcher saw change in', () => {
    let session: RootsSession;
    let idle: Promise<void>;

    beforeEach(async () => {
      session = new RootsSession(sessionPortsWith({ readCached: noCache() }));
      session.setRoots([A_FOLDER]);
      session.setVisible(true);
      await session.whenIdle('/a');
      vi.useFakeTimers();
      session.changed('/a');
      idle = session.whenIdle('/a');
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('WHEN the debounce has not passed THEN the root is not idle', async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1);

      const state = stateOf(idle);

      await vi.advanceTimersByTimeAsync(0);

      await expect(state).resolves.toBe('waiting');
    });

    it('WHEN the debounce passes THEN one full load runs before the root is idle', async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      await idle;

      const modes = session.loads.get('/a')?.map((record) => [record.mode, record.outcome]);

      expect(modes).toStrictEqual([
        ['cache-first', 'model'],
        ['full', 'model']
      ]);
    });
  });

  describe('GIVEN a hidden root a watcher saw change in', () => {
    let session: RootsSession;

    beforeEach(() => {
      vi.useFakeTimers();
      session = new RootsSession(sessionPortsWith({ readCached: noCache() }));
      session.setRoots([A_FOLDER]);
      session.changed('/a');
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('WHEN the debounce passes THEN nothing loads', () => {
      vi.advanceTimersByTime(DEBOUNCE_MS);

      expect(session.loads.get('/a')).toStrictEqual([]);
    });

    it('WHEN the debounce passes THEN the root is stale', () => {
      vi.advanceTimersByTime(DEBOUNCE_MS);

      const isStale = session.store.get('/a')?.coordinator.isStale();

      expect(isStale).toBe(true);
    });

    it('WHEN the session is disposed THEN a wait on the root resolves', async () => {
      const idle = session.whenIdle('/a');

      session.dispose();

      await expect(idle).resolves.toBeUndefined();
    });
  });
});
