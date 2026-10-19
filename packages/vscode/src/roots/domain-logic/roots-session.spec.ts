import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CachedWorkspace, WorkspaceModel } from '@turbo-console/core';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { RootsSession } from './roots-session.ts';
import type { Coordinator } from '../common/coordinator.type.ts';
import type { LoadDeps, RootFolder, SessionPorts } from '../common/root.type.ts';
import { CACHED_WORKSPACE_STUB, LOAD_FAILURE_STUB, TURBO_BINARY_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/root.stub.ts';
import { sessionPortsWith, tickLoad } from '../test/utils/session-ports.spec.util.ts';

const A_FOLDER: RootFolder = { root: '/a', name: 'a' };

const B_FOLDER: RootFolder = { root: '/b', name: 'b' };

const C_FOLDER: RootFolder = { root: '/c', name: 'c' };

const WARNED_MODEL: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, warnings: ['first', 'two\nlines'] };

const WARNED_CACHE: CachedWorkspace = { ...CACHED_WORKSPACE_STUB, model: WARNED_MODEL };

const noCache = (): LoadDeps['readCached'] => vi.fn().mockResolvedValue(null);

const LOAD_STAGE_ERROR = { stage: 'load' };

const coordinatorOf = (session: RootsSession, root: string): Coordinator => {
  const entry = session.store.get(root);

  if (entry === undefined) throw new Error(`no entry for ${root}`);

  return entry.coordinator;
};

const ensureAll = async (session: RootsSession): Promise<void> => {
  const ensures = session.store.all().map(async (entry) => entry.coordinator.ensureLoaded());

  await Promise.all(ensures);
};

describe('FEATURE: roots session', () => {
  describe('GIVEN three roots whose loads each take a tick', () => {
    let peaks: number[];

    beforeEach(async () => {
      peaks = [];

      const ports = sessionPortsWith({ readCached: noCache(), load: tickLoad(peaks) });
      const session = new RootsSession(ports);

      session.setRoots([A_FOLDER, B_FOLDER, C_FOLDER]);
      await ensureAll(session);
    });

    it('WHEN all three are ensured together THEN at most two loads run at once', () => {
      const peak = Math.max(...peaks);

      expect(peak).toBe(2);
    });

    it('WHEN all three are ensured together THEN all three load', () => {
      expect(peaks).toHaveLength(3);
    });
  });

  describe('GIVEN two roots', () => {
    let session: RootsSession;

    beforeEach(() => {
      const ports = sessionPortsWith({ readCached: noCache() });

      session = new RootsSession(ports);
      session.setRoots([A_FOLDER, B_FOLDER]);
    });

    it('WHEN they are set THEN each has an empty load list', () => {
      const loads = Array.from(session.loads);

      expect(loads).toStrictEqual([
        ['/a', []],
        ['/b', []]
      ]);
    });

    it('WHEN one is dropped THEN its load list goes', () => {
      session.setRoots([B_FOLDER]);

      const roots = Array.from(session.loads.keys());

      expect(roots).toStrictEqual(['/b']);
    });

    it('WHEN an unknown root is awaited THEN it rejects naming the known roots', async () => {
      const idle = session.whenIdle('/nope');

      await expect(idle).rejects.toThrow('unknown root /nope; known: /a, /b');
    });

    it('WHEN an idle root is awaited THEN it resolves', async () => {
      const idle = session.whenIdle('/a');

      await expect(idle).resolves.toBeUndefined();
    });

    it('WHEN the view turns visible THEN each root starts a cache-first load', () => {
      session.setVisible(true);

      const modes = Array.from(session.loads.values(), (records) => records.map((record) => record.mode));

      expect(modes).toStrictEqual([['cache-first'], ['cache-first']]);
    });

    it('WHEN the view turns hidden THEN no load starts', () => {
      session.setVisible(false);

      const counts = Array.from(session.loads.values(), (records) => records.length);

      expect(counts).toStrictEqual([0, 0]);
    });

    it('WHEN a refresh is requested THEN each root starts a full load', () => {
      session.request('refresh');

      const modes = Array.from(session.loads.values(), (records) => records.map((record) => record.mode));

      expect(modes).toStrictEqual([['full'], ['full']]);
    });

    it('WHEN a root is ensured THEN its model reaches the store', async () => {
      await ensureAll(session);

      const model = session.store.get('/a')?.state.model;

      expect(model).toStrictEqual(WORKSPACE_MODEL_STUB);
    });

    it('WHEN a root is ensured THEN its load record reads a model', async () => {
      await ensureAll(session);

      const outcome = session.loads.get('/a')?.[0]?.outcome;

      expect(outcome).toBe('model');
    });
  });

  describe('GIVEN a root whose store listener throws', () => {
    it('WHEN it loads THEN the error goes to the log instead of out of the load', async () => {
      const log = vi.fn();
      const session = new RootsSession(sessionPortsWith({ readCached: noCache(), log }));

      session.setRoots([A_FOLDER]);
      session.store.onDidChange(() => {
        throw new Error('listener broke');
      });

      await ensureAll(session);

      expect(log).toHaveBeenCalledExactlyOnceWith('listener broke');
    });
  });

  describe('GIVEN a root with a fresh cache', () => {
    it('WHEN it is ensured THEN the store holds the cached model with the resolved binary', async () => {
      const session = new RootsSession(sessionPortsWith({}));

      session.setRoots([A_FOLDER]);
      await ensureAll(session);

      const state = session.store.get('/a')?.state;

      expect(state).toStrictEqual({ folder: A_FOLDER, binary: TURBO_BINARY_STUB, model: WORKSPACE_MODEL_STUB, error: null });
    });

    it('WHEN it is ensured THEN the store changes twice: before and after the binary resolves, not again once fresh', async () => {
      const session = new RootsSession(sessionPortsWith({}));
      const listener = vi.fn();

      session.setRoots([A_FOLDER]);
      session.store.onDidChange(listener);
      await ensureAll(session);

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('WHEN a refresh lands before its binary resolves and the full load then fails THEN the store drops the cached model', async () => {
      const first = Promise.withResolvers<typeof TURBO_BINARY_STUB>();
      const pendingUntilAbort: LoadDeps['resolve'] = async (signal) => {
        const aborted = new Promise<never>((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(signal.reason as Error);
          });
        });

        return Promise.race([first.promise, aborted]);
      };
      const resolve = vi.fn<LoadDeps['resolve']>().mockImplementationOnce(pendingUntilAbort).mockResolvedValue(TURBO_BINARY_STUB);
      const load = vi.fn<LoadDeps['load']>().mockRejectedValue(LOAD_FAILURE_STUB.error);
      const session = new RootsSession(sessionPortsWith({ resolve, load }));

      session.setRoots([A_FOLDER]);

      const coordinator = coordinatorOf(session, '/a');

      void coordinator.ensureLoaded();
      await vi.waitFor(() => {
        expect(session.store.get('/a')?.state.model).not.toBeNull();
      });
      coordinator.request('refresh');
      await coordinator.whenSettled();

      expect(session.store.get('/a')?.state).toMatchObject({ binary: null, model: null, error: LOAD_STAGE_ERROR });
    });

    it('WHEN its binary is never found THEN the store drops the cached model and holds the binary error', async () => {
      const resolve = vi.fn<LoadDeps['resolve']>().mockRejectedValue(LOAD_FAILURE_STUB.error);
      const session = new RootsSession(sessionPortsWith({ resolve }));

      session.setRoots([A_FOLDER]);
      await ensureAll(session);

      const state = session.store.get('/a')?.state;

      expect(state).toStrictEqual({ folder: A_FOLDER, binary: null, model: null, error: LOAD_FAILURE_STUB });
    });
  });

  describe('GIVEN a root whose fresh cache holds a model with warnings', () => {
    it('WHEN it is ensured THEN each warning is logged once as one clean line', async () => {
      const readCached = vi.fn().mockResolvedValue(WARNED_CACHE);
      const ports: SessionPorts = sessionPortsWith({ readCached });
      const session = new RootsSession(ports);

      session.setRoots([A_FOLDER]);
      await ensureAll(session);

      expect(vi.mocked(ports.warn).mock.calls).toStrictEqual([['first'], ['two lines']]);
    });
  });

  describe('GIVEN a root with no cache whose load returns a model with warnings', () => {
    it('WHEN it is ensured THEN each warning is logged once as one clean line', async () => {
      const load = vi.fn().mockResolvedValue(WARNED_MODEL);
      const ports: SessionPorts = sessionPortsWith({ readCached: noCache(), load });
      const session = new RootsSession(ports);

      session.setRoots([A_FOLDER]);
      await ensureAll(session);

      expect(vi.mocked(ports.warn).mock.calls).toStrictEqual([['first'], ['two lines']]);
    });
  });

  describe('GIVEN a root whose warning log throws', () => {
    const load = vi.fn().mockResolvedValue(WARNED_MODEL);
    const log = vi.fn();
    const base = sessionPortsWith({ readCached: noCache(), load, log });
    const warn = vi.fn(() => {
      throw new Error('warn broke');
    });
    const ports: SessionPorts = { ...base, warn };
    let session: RootsSession;

    beforeEach(async () => {
      session = new RootsSession(ports);
      session.setRoots([A_FOLDER]);
      await ensureAll(session);
    });

    it('WHEN a model with warnings loads THEN the model still reaches the store', () => {
      const model = session.store.get('/a')?.state.model;

      expect(model).toStrictEqual(WARNED_MODEL);
    });

    it('WHEN a model with warnings loads THEN the error goes to the log instead of out of the load', () => {
      expect(log).toHaveBeenCalledWith('warn broke');
    });
  });

  describe('GIVEN workspace folders on disk, one holding turbo.json', () => {
    let parent = '';

    beforeAll(async () => {
      parent = await mkdtemp(join(tmpdir(), 'roots-session-'));

      await mkdir(join(parent, 'turbo'));
      await writeFile(join(parent, 'turbo', 'turbo.json'), '{}');
      await mkdir(join(parent, 'plain'));
    });

    afterAll(async () => {
      await rm(parent, { recursive: true, force: true, maxRetries: 5 });
    });

    it('WHEN the folders are set THEN only that folder becomes a root', async () => {
      const session = new RootsSession(sessionPortsWith({}));
      const turbo: RootFolder = { root: join(parent, 'turbo'), name: 'turbo' };
      const plain: RootFolder = { root: join(parent, 'plain'), name: 'plain' };

      await session.setWorkspaceFolders([turbo, plain]);

      const roots = Array.from(session.loads.keys());

      expect(roots).toStrictEqual([turbo.root]);
    });

    it('WHEN the folders are set THEN rootsFoundAt is stamped once the disk answered, not when the call starts', async () => {
      const session = new RootsSession(sessionPortsWith({}));
      const turbo: RootFolder = { root: join(parent, 'turbo'), name: 'turbo' };
      const setting = session.setWorkspaceFolders([turbo]);
      const whileReading = session.rootsFoundAt;

      await setting;

      expect([whileReading, session.rootsFoundAt]).toStrictEqual([null, 1]);
    });

    it('WHEN a newer folder set lands before an older one THEN the older one is not applied', async () => {
      const session = new RootsSession(sessionPortsWith({}));
      const turbo: RootFolder = { root: join(parent, 'turbo'), name: 'turbo' };
      const older = session.setWorkspaceFolders([turbo]);
      const newer = session.setWorkspaceFolders([]);

      await Promise.all([older, newer]);

      const roots = Array.from(session.loads.keys());

      expect(roots).toStrictEqual([]);
    });
  });
});
