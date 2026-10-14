import { TurboException } from '@turbo-console/core';
import type { CachedWorkspace } from '@turbo-console/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadRoot } from './load-root.ts';
import type { LoadedModel } from '../common/root.type.ts';
import { LOAD_DEADLINE_MS } from '../common/roots.const.ts';
import { loadDepsMock } from '../test/mocks/load-deps.mock.ts';
import { CACHED_WORKSPACE_STUB, TURBO_BINARY_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/root.stub.ts';
import { loadUntilAborted } from '../test/utils/abortable-load.spec.util.ts';

const STALE_CACHE: CachedWorkspace = { ...CACHED_WORKSPACE_STUB, isFresh: false };

const LOADED: LoadedModel = {
  kind: 'model',
  binary: TURBO_BINARY_STUB,
  model: WORKSPACE_MODEL_STUB,
  fromCache: false,
  isFresh: true
};

describe('FEATURE: load a root', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GIVEN the binary cannot be resolved', () => {
    it('WHEN loaded THEN it is a binary failure, load never runs and the error is logged', async () => {
      const deps = loadDepsMock();
      const notFound = new TurboException('not-found', 'no turbo');

      vi.mocked(deps.resolve).mockRejectedValue(notFound);

      const result = await loadRoot('cache-first', deps, new AbortController().signal, vi.fn());

      expect(result).toStrictEqual({ kind: 'error', stage: 'binary', error: notFound });
      expect(deps.load).not.toHaveBeenCalled();
      expect(deps.readCached).not.toHaveBeenCalled();
      expect(deps.log).toHaveBeenCalledWith(notFound);
    });

    it('WHEN resolve throws a plain Error THEN it is wrapped as a failed TurboException', async () => {
      const deps = loadDepsMock();

      vi.mocked(deps.resolve).mockRejectedValue(new Error('boom'));

      const result = await loadRoot('full', deps, new AbortController().signal, vi.fn());

      expect(result).toStrictEqual({ kind: 'error', stage: 'binary', error: new TurboException('failed', 'boom') });
    });
  });

  describe('GIVEN cache-first mode and a fresh cache', () => {
    it('WHEN loaded THEN the cached model is published and returned, and load never runs', async () => {
      const deps = loadDepsMock();
      const publish = vi.fn();

      const result = await loadRoot('cache-first', deps, new AbortController().signal, publish);

      const expected: LoadedModel = { ...LOADED, fromCache: true };

      expect(result).toStrictEqual(expected);
      expect(publish).toHaveBeenCalledExactlyOnceWith(expected);
      expect(deps.load).not.toHaveBeenCalled();
      expect(deps.progress).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN cache-first mode and a stale cache', () => {
    it('WHEN loaded THEN the stale model is published first, then load runs and its model is returned', async () => {
      const deps = loadDepsMock();
      const publish = vi.fn();

      vi.mocked(deps.readCached).mockResolvedValue(STALE_CACHE);

      const result = await loadRoot('cache-first', deps, new AbortController().signal, publish);

      const stale: LoadedModel = { ...LOADED, fromCache: true, isFresh: false };

      expect(publish).toHaveBeenCalledExactlyOnceWith(stale);
      expect(deps.load).toHaveBeenCalledOnce();
      expect(result).toStrictEqual(LOADED);
    });
  });

  describe('GIVEN cache-first mode and no cache', () => {
    it('WHEN loaded THEN nothing is published and load runs under progress', async () => {
      const deps = loadDepsMock();
      const publish = vi.fn();

      vi.mocked(deps.readCached).mockResolvedValue(null);

      const result = await loadRoot('cache-first', deps, new AbortController().signal, publish);

      expect(publish).not.toHaveBeenCalled();
      expect(deps.progress).toHaveBeenCalledOnce();
      expect(deps.load).toHaveBeenCalledOnce();
      expect(result).toStrictEqual(LOADED);
    });
  });

  describe('GIVEN cache-first mode and a cache read that throws', () => {
    it('WHEN loaded THEN the error is logged and load runs as with no cache', async () => {
      const deps = loadDepsMock();
      const unreadable = new TurboException('io', 'disk');

      vi.mocked(deps.readCached).mockRejectedValue(unreadable);

      const result = await loadRoot('cache-first', deps, new AbortController().signal, vi.fn());

      expect(deps.log).toHaveBeenCalledWith(unreadable);
      expect(deps.load).toHaveBeenCalledOnce();
      expect(result).toStrictEqual(LOADED);
    });
  });

  describe('GIVEN full mode', () => {
    it('WHEN loaded THEN the cache is never read and the model comes from load', async () => {
      const deps = loadDepsMock();

      const result = await loadRoot('full', deps, new AbortController().signal, vi.fn());

      expect(deps.readCached).not.toHaveBeenCalled();
      expect(deps.load).toHaveBeenCalledWith(TURBO_BINARY_STUB, expect.any(AbortSignal));
      expect(result).toStrictEqual(LOADED);
    });
  });

  describe('GIVEN load throws', () => {
    it('WHEN it throws a TurboException THEN it is a load failure with that error, logged', async () => {
      const deps = loadDepsMock();
      const failed = new TurboException('failed', 'turbo exited 1');

      vi.mocked(deps.load).mockRejectedValue(failed);

      const result = await loadRoot('full', deps, new AbortController().signal, vi.fn());

      expect(result).toStrictEqual({ kind: 'error', stage: 'load', error: failed });
      expect(deps.log).toHaveBeenCalledWith(failed);
    });

    it('WHEN it throws something else THEN it is wrapped as a failed TurboException', async () => {
      const deps = loadDepsMock();

      vi.mocked(deps.load).mockRejectedValue('plain string');

      const result = await loadRoot('full', deps, new AbortController().signal, vi.fn());

      expect(result).toStrictEqual({ kind: 'error', stage: 'load', error: new TurboException('failed', 'plain string') });
    });
  });

  describe('GIVEN the caller aborts while load runs', () => {
    it('WHEN the load settles THEN it is a load failure and nothing is logged', async () => {
      const deps = loadDepsMock();
      const controller = new AbortController();

      vi.mocked(deps.load).mockImplementation(loadUntilAborted);

      const pending = loadRoot('full', deps, controller.signal, vi.fn());

      controller.abort();

      const result = await pending;

      expect(result).toMatchObject({ kind: 'error', stage: 'load' });
      expect(deps.log).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a load signal', () => {
    it('WHEN the caller aborts THEN the signal given to load aborts, and it is not the caller own signal', async () => {
      const deps = loadDepsMock();
      const controller = new AbortController();
      let given: AbortSignal | null = null;

      vi.mocked(deps.load).mockImplementation(async (_binary, signal) => {
        given = signal;

        return Promise.resolve(WORKSPACE_MODEL_STUB);
      });

      await loadRoot('full', deps, controller.signal, vi.fn());

      expect(given).not.toBe(controller.signal);
      expect(given).toHaveProperty('aborted', false);

      controller.abort();

      expect(given).toHaveProperty('aborted', true);
    });

    it('WHEN load starts THEN a 60 s deadline is part of the signal', async () => {
      const deps = loadDepsMock();
      const timeout = vi.spyOn(AbortSignal, 'timeout');

      await loadRoot('full', deps, new AbortController().signal, vi.fn());

      expect(timeout).toHaveBeenCalledExactlyOnceWith(LOAD_DEADLINE_MS);
      expect(LOAD_DEADLINE_MS).toBe(60_000);
    });
  });

  describe('GIVEN the caller signal reaches resolve', () => {
    it('WHEN loaded THEN resolve gets the caller own signal', async () => {
      const deps = loadDepsMock();
      const controller = new AbortController();

      await loadRoot('full', deps, controller.signal, vi.fn());

      expect(deps.resolve).toHaveBeenCalledExactlyOnceWith(controller.signal);
    });
  });
});
