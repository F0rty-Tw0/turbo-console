import type { PackageNode, WorkspaceModel } from '@turbo-console/core';
import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerWatchers } from './register-watchers.ts';
import type { LoadDeps, RootFolder, SessionPorts } from '../../roots/common/root.type.ts';
import { RootsSession } from '../../roots/domain-logic/roots-session.ts';
import { WORKSPACE_MODEL_STUB } from '../../roots/test/stubs/root.stub.ts';
import { sessionPortsWith } from '../../roots/test/utils/session-ports.spec.util.ts';
import { DEBOUNCE_MS } from '../common/watch.const.ts';
import type { RootWatchers, WatchPorts, WatchRoot } from '../common/watch.type.ts';

const A_FOLDER: RootFolder = { root: '/a', name: 'a' };

const B_FOLDER: RootFolder = { root: '/b', name: 'b' };

const C_FOLDER: RootFolder = { root: '/c', name: 'c' };

const PACKAGE: PackageNode = { name: '@x/a', path: 'packages/a', label: null, tags: [], tasks: [] };

const MODEL: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages: [PACKAGE] };

const B_PACKAGE: PackageNode = { ...PACKAGE, name: '@x/b', path: 'packages/b' };

const B_MODEL: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages: [B_PACKAGE] };

const MODELS = new Map([['/b', B_MODEL]]);

const noCache = (): LoadDeps['readCached'] => vi.fn().mockResolvedValue(null);

/** Session ports where /b loads its own model, so watchers reading another root's model show up. */
const sessionPorts = (): SessionPorts => {
  const base = sessionPortsWith({ readCached: noCache() });
  const depsFor: SessionPorts['depsFor'] = (root, acquire) => {
    const deps = base.depsFor(root, acquire);
    const load = vi.fn().mockResolvedValue(MODELS.get(root) ?? MODEL);
    const rootDeps: LoadDeps = { ...deps, load };

    return rootDeps;
  };
  const ports: SessionPorts = { ...base, depsFor };

  return ports;
};

describe('FEATURE: root watchers', () => {
  let session: RootsSession;
  let watch: Mock<WatchRoot>;
  let stops: Map<string, Mock<() => void>>;
  let ports: Map<string, WatchPorts>;
  let watchers: RootWatchers;

  /** One full load of `root`, so the store applies one result for it. */
  const loadOnce = async (root: string): Promise<void> => {
    const entry = session.store.get(root);

    entry?.coordinator.request('refresh');
    await session.whenIdle(root);
  };

  const watchedRoots = (): string[] => watch.mock.calls.map(([root]) => root);

  const portsOf = (root: string): WatchPorts => {
    const found = ports.get(root);

    if (found === undefined) throw new Error(`${root} is not watched`);

    return found;
  };

  beforeEach(() => {
    session = new RootsSession(sessionPorts());
    session.setRoots([A_FOLDER, B_FOLDER]);
    stops = new Map();
    ports = new Map();
    watch = vi.fn((root: string, rootPorts: WatchPorts) => {
      const stop = vi.fn<() => void>();

      stops.set(root, stop);
      ports.set(root, rootPorts);

      return stop;
    });
    watchers = registerWatchers(session, watch);
  });

  afterEach(() => {
    watchers.dispose();
    session.dispose();
    vi.useRealTimers();
  });

  describe('GIVEN roots that never loaded', () => {
    it('WHEN nothing loads THEN no root is watched', () => {
      expect(watch).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN root /a loaded twice', () => {
    it('WHEN the second load lands THEN only /a is watched, once', async () => {
      await loadOnce('/a');
      await loadOnce('/a');

      expect(watchedRoots()).toStrictEqual(['/a']);
    });
  });

  describe('GIVEN both roots loaded', () => {
    beforeEach(async () => {
      await loadOnce('/a');
      await loadOnce('/b');
    });

    it('WHEN /a stops being a root and prune runs THEN the watchers of /a stop once', () => {
      session.setRoots([B_FOLDER]);
      watchers.prune();
      watchers.prune();

      expect(stops.get('/a')).toHaveBeenCalledOnce();
    });

    it('WHEN /a stops being a root and prune runs THEN the watchers of /b keep running', () => {
      session.setRoots([B_FOLDER]);
      watchers.prune();

      expect(stops.get('/b')).not.toHaveBeenCalled();
    });

    it('WHEN prune runs with both still roots THEN nothing stops', () => {
      watchers.prune();

      const stopped = Array.from(stops.values(), (stop) => stop.mock.calls.length);

      expect(stopped).toStrictEqual([0, 0]);
    });

    it('WHEN it is disposed THEN the watchers of every root stop once', () => {
      watchers.dispose();

      const stopped = Array.from(stops.values(), (stop) => stop.mock.calls.length);

      expect(stopped).toStrictEqual([1, 1]);
    });

    it('WHEN it is disposed and a new root loads THEN that root is not watched', async () => {
      watchers.dispose();
      session.setRoots([A_FOLDER, B_FOLDER, C_FOLDER]);
      await loadOnce('/c');

      expect(watchedRoots()).toStrictEqual(['/a', '/b']);
    });

    it('WHEN the watchers of /a read the package paths THEN they get the shown model paths', () => {
      const paths = portsOf('/a').packagePaths();

      expect(paths).toStrictEqual(['packages/a']);
    });
  });

  describe('GIVEN a shown root /a whose watchers report three changes', () => {
    it('WHEN the debounce passes THEN one full load runs', async () => {
      session.setVisible(true);
      await session.whenIdle('/a');
      vi.useFakeTimers();

      const { changed } = portsOf('/a');

      changed();
      changed();
      changed();
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      await session.whenIdle('/a');

      const records = session.loads.get('/a') ?? [];
      const modes = records.map((record) => record.mode);

      expect(modes).toStrictEqual(['cache-first', 'full']);
    });
  });
});
