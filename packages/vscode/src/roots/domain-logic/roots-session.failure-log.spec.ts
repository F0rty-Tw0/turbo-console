import { TurboException } from '@turbo-console/core';
import type { TurboBinary, WorkspaceModel } from '@turbo-console/core';
import { describe, expect, it, vi } from 'vitest';

import { RootsSession } from './roots-session.ts';
import type { LoadDeps, RootFolder } from '../common/root.type.ts';
import { TURBO_BINARY_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/root.stub.ts';
import { sessionPortsWith } from '../test/utils/session-ports.spec.util.ts';

const A_FOLDER: RootFolder = { root: '/a', name: 'a' };

const NOT_FOUND = new TurboException('not-found', 'no turbo');

const UNSUPPORTED = new TurboException('version-unsupported', 'turbo 2.10.4');

const NOT_FOUND_LINE = 'turbo not-found: no turbo';

const UNSUPPORTED_LINE = 'turbo version-unsupported: turbo 2.10.4';

const sessionWith = (overrides: Partial<LoadDeps>): RootsSession => {
  const ports = sessionPortsWith(overrides);
  const session = new RootsSession(ports);

  session.setRoots([A_FOLDER]);

  return session;
};

const ensureTimes = async (session: RootsSession, times: number): Promise<void> => {
  for (let index = 0; index < times; index += 1) await session.store.get(A_FOLDER.root)?.coordinator.ensureLoaded();
};

const refreshTimes = async (session: RootsSession, times: number): Promise<void> => {
  for (let index = 0; index < times; index += 1) {
    session.request('refresh');
    await session.whenIdle(A_FOLDER.root);
  }
};

/** Rejects with `aborted` once its signal aborts, as core's load does. */
const loadUntilAborted = async (_binary: TurboBinary, signal: AbortSignal): Promise<WorkspaceModel> => {
  const { promise, reject } = Promise.withResolvers<WorkspaceModel>();

  signal.addEventListener('abort', () => {
    reject(new Error('aborted'));
  });

  return promise;
};

describe('FEATURE: roots session failure log', () => {
  describe('GIVEN a root whose binary is never found', () => {
    it('WHEN it is ensured three times THEN the error is logged once', async () => {
      const log = vi.fn();
      const resolve = vi.fn<LoadDeps['resolve']>().mockRejectedValue(NOT_FOUND);
      const session = sessionWith({ resolve, log });

      await ensureTimes(session, 3);

      expect(resolve).toHaveBeenCalledTimes(3);
      expect(log.mock.calls).toStrictEqual([[NOT_FOUND_LINE]]);
    });
  });

  describe('GIVEN a root whose binary is not found, then unsupported', () => {
    it('WHEN it is refreshed three times THEN each error is logged once', async () => {
      const log = vi.fn();
      const resolve = vi.fn<LoadDeps['resolve']>().mockRejectedValueOnce(NOT_FOUND).mockRejectedValue(UNSUPPORTED);
      const session = sessionWith({ resolve, log });

      await refreshTimes(session, 3);

      expect(log.mock.calls).toStrictEqual([[NOT_FOUND_LINE], [UNSUPPORTED_LINE]]);
    });
  });

  describe('GIVEN a root that fails, loads, then fails the same way', () => {
    it('WHEN it is refreshed three times THEN the error is logged again after the load', async () => {
      const log = vi.fn();
      const failsFirst = vi.fn<LoadDeps['resolve']>().mockRejectedValueOnce(NOT_FOUND);
      const resolve = failsFirst.mockResolvedValueOnce(TURBO_BINARY_STUB).mockRejectedValue(NOT_FOUND);
      const session = sessionWith({ resolve, log });

      await refreshTimes(session, 3);

      expect(log.mock.calls).toStrictEqual([[NOT_FOUND_LINE], [NOT_FOUND_LINE]]);
    });
  });

  describe('GIVEN a root whose load throws a plain Error', () => {
    it('WHEN it is refreshed twice THEN its bare message is logged once, with no turbo prefix', async () => {
      const log = vi.fn();
      const load = vi.fn<LoadDeps['load']>().mockRejectedValue(new Error('disk full'));
      const session = sessionWith({ load, log });

      await refreshTimes(session, 2);

      expect(log.mock.calls).toStrictEqual([['disk full']]);
    });
  });

  describe('GIVEN a root whose first load fails only once it is aborted', () => {
    it('WHEN a second refresh replaces it THEN nothing is logged', async () => {
      const log = vi.fn();
      const load = vi.fn<LoadDeps['load']>().mockImplementationOnce(loadUntilAborted).mockResolvedValue(WORKSPACE_MODEL_STUB);
      const session = sessionWith({ load, log });

      session.request('refresh');
      await vi.waitFor(() => {
        expect(load).toHaveBeenCalledOnce();
      });
      await refreshTimes(session, 1);

      expect(log).not.toHaveBeenCalled();
    });
  });
});
