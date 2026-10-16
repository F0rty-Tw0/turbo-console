import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RootsSession } from './roots-session.ts';
import type { LoadDeps, RootFolder } from '../common/root.type.ts';
import { sessionPortsWith } from '../test/utils/session-ports.spec.util.ts';

const A_FOLDER: RootFolder = { root: '/a', name: 'a' };

const B_FOLDER: RootFolder = { root: '/b', name: 'b' };

const X_FOLDER: RootFolder = { root: '/x', name: 'x' };

const noCache = (): LoadDeps['readCached'] => vi.fn().mockResolvedValue(null);

const failingLoad = (): LoadDeps['load'] => vi.fn().mockRejectedValue(new Error('boom'));

const modesOf = (session: RootsSession, root: string): string[] | undefined => session.loads.get(root)?.map((record) => record.mode);

/** Hides and shows panel `p1` on `/a`, then shows and hides the tree, `count` times, letting `/a` settle after each. */
const hideAndShowTimes = async (session: RootsSession, count: number): Promise<void> => {
  for (let cycle = 0; cycle < count; cycle += 1) {
    session.setPanelVisible('/a', 'p1', false);
    session.setPanelVisible('/a', 'p1', true);
    session.setVisible(true);
    session.setVisible(false);
    await session.whenIdle('/a');
  }
};

describe('FEATURE: roots session panel visibility', () => {
  describe('GIVEN two roots and a hidden tree', () => {
    let session: RootsSession;

    beforeEach(() => {
      session = new RootsSession(sessionPortsWith({ readCached: noCache() }));
      session.setRoots([A_FOLDER, B_FOLDER]);
    });

    it('WHEN a panel on a turns visible THEN a starts one cache-first load', async () => {
      session.setPanelVisible('/a', 'p1', true);
      await session.whenIdle('/a');

      expect(modesOf(session, '/a')).toStrictEqual(['cache-first']);
    });

    it('WHEN a panel on a turns visible THEN b loads nothing', async () => {
      session.setPanelVisible('/a', 'p1', true);
      await session.whenIdle('/a');

      expect(modesOf(session, '/b')).toStrictEqual([]);
    });

    it('WHEN a panel on a is visible and a change is requested THEN a loads in full', async () => {
      session.setPanelVisible('/a', 'p1', true);
      await session.whenIdle('/a');
      session.request('watch');
      await session.whenIdle('/a');

      expect(modesOf(session, '/a')).toStrictEqual(['cache-first', 'full']);
    });

    it('WHEN a panel on a is visible and a change is requested THEN b stays unloaded', async () => {
      session.setPanelVisible('/a', 'p1', true);
      session.request('watch');
      await session.whenIdle('/a');

      expect(modesOf(session, '/b')).toStrictEqual([]);
    });

    it('WHEN the panel turns hidden again and a change is requested THEN a loads nothing more', async () => {
      session.setPanelVisible('/a', 'p1', true);
      await session.whenIdle('/a');
      session.setPanelVisible('/a', 'p1', false);
      session.request('watch');

      expect(modesOf(session, '/a')).toStrictEqual(['cache-first']);
    });

    it('WHEN one of two panels on a turns hidden and a change is requested THEN a still loads in full', async () => {
      session.setPanelVisible('/a', 'p1', true);
      session.setPanelVisible('/a', 'p2', true);
      await session.whenIdle('/a');
      session.setPanelVisible('/a', 'p1', false);
      session.request('watch');
      await session.whenIdle('/a');

      expect(modesOf(session, '/a')).toStrictEqual(['cache-first', 'full']);
    });

    it('WHEN a removed root comes back THEN its old panel no longer counts as visible', async () => {
      session.setPanelVisible('/a', 'p1', true);
      await session.whenIdle('/a');
      session.setRoots([B_FOLDER]);
      session.setRoots([A_FOLDER, B_FOLDER]);
      session.request('watch');

      expect(modesOf(session, '/a')).toStrictEqual([]);
    });

    it('WHEN a panel turns visible on a folder before it is a root THEN that root does not count as visible once added', () => {
      session.setPanelVisible(X_FOLDER.root, 'p1', true);
      session.setRoots([A_FOLDER, B_FOLDER, X_FOLDER]);
      session.request('watch');

      expect(modesOf(session, X_FOLDER.root)).toStrictEqual([]);
    });

    it('WHEN a stale root gets a panel hidden report THEN it loads nothing', () => {
      session.request('watch');
      session.setPanelVisible('/a', 'p1', false);

      expect(modesOf(session, '/a')).toStrictEqual([]);
    });
  });

  describe('GIVEN a root loaded from its cache whose reload after a hidden change failed', () => {
    let session: RootsSession;

    beforeEach(async () => {
      session = new RootsSession(sessionPortsWith({ load: failingLoad() }));
      session.setRoots([A_FOLDER]);
      session.setPanelVisible('/a', 'p1', true);
      await session.whenIdle('/a');
      session.setPanelVisible('/a', 'p1', false);
      session.request('watch');
      session.setPanelVisible('/a', 'p1', true);
      await session.whenIdle('/a');
    });

    it('WHEN the panel and the tree are hidden and shown three times THEN no load starts', async () => {
      await hideAndShowTimes(session, 3);

      expect(modesOf(session, '/a')).toStrictEqual(['cache-first', 'full']);
    });

    it('WHEN a change comes in while the panel is visible THEN exactly one full load runs', async () => {
      await hideAndShowTimes(session, 3);
      session.request('watch');
      await session.whenIdle('/a');
      await hideAndShowTimes(session, 1);

      expect(modesOf(session, '/a')).toStrictEqual(['cache-first', 'full', 'full']);
    });

    it('WHEN Retry asks for a refresh THEN one full load runs', async () => {
      session.request('refresh');
      await session.whenIdle('/a');

      expect(modesOf(session, '/a')).toStrictEqual(['cache-first', 'full', 'full']);
    });
  });
});
