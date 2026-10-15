import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RootsSession } from './roots-session.ts';
import type { LoadDeps, RootFolder } from '../common/root.type.ts';
import { sessionPortsWith } from '../test/utils/session-ports.spec.util.ts';

const A_FOLDER: RootFolder = { root: '/a', name: 'a' };

const B_FOLDER: RootFolder = { root: '/b', name: 'b' };

const X_FOLDER: RootFolder = { root: '/x', name: 'x' };

const noCache = (): LoadDeps['readCached'] => vi.fn().mockResolvedValue(null);

const modesOf = (session: RootsSession, root: string): string[] | undefined =>
  session.loads.get(root)?.map((record) => record.mode);

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
});
