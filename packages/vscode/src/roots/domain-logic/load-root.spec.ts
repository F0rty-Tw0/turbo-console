import { TurboException } from '@turbo-console/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadRoot } from './load-root.ts';
import type { LoadedModel } from '../common/root.type.ts';
import { loadDepsMock } from '../test/mocks/load-deps.mock.ts';
import { STALE_CACHED_WORKSPACE_STUB, TURBO_BINARY_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/root.stub.ts';

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
    it('WHEN loaded THEN it is a binary failure, load never runs and nothing is logged', async () => {
      const deps = loadDepsMock();
      const notFound = new TurboException('not-found', 'no turbo');

      vi.mocked(deps.resolve).mockRejectedValue(notFound);

      const result = await loadRoot('cache-first', deps, new AbortController().signal, vi.fn());

      expect(result).toStrictEqual({ kind: 'error', stage: 'binary', error: notFound, logText: 'turbo not-found: no turbo' });
      expect(deps.load).not.toHaveBeenCalled();
      expect(deps.readCached).not.toHaveBeenCalled();
      expect(deps.log).not.toHaveBeenCalled();
    });

    it('WHEN resolve throws a plain Error THEN it is wrapped as a failed TurboException and its line is the bare message', async () => {
      const deps = loadDepsMock();

      vi.mocked(deps.resolve).mockRejectedValue(new Error('boom'));

      const result = await loadRoot('full', deps, new AbortController().signal, vi.fn());

      expect(result).toStrictEqual({ kind: 'error', stage: 'binary', error: new TurboException('failed', 'boom'), logText: 'boom' });
      expect(deps.log).not.toHaveBeenCalled();
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
      expect(result).toBe(publish.mock.calls[0]?.[0]);
      expect(deps.load).not.toHaveBeenCalled();
      expect(deps.progress).not.toHaveBeenCalled();
      expect(deps.acquire).not.toHaveBeenCalled();
    });

    it('WHEN publish throws THEN the cached model is still returned and the error is logged', async () => {
      const deps = loadDepsMock();
      const publish = vi.fn(() => {
        throw new Error('view gone');
      });

      const result = await loadRoot('cache-first', deps, new AbortController().signal, publish);

      expect(result).toStrictEqual({ ...LOADED, fromCache: true });
      expect(deps.log).toHaveBeenCalledExactlyOnceWith('view gone');
    });
  });

  describe('GIVEN cache-first mode and a stale cache', () => {
    it('WHEN loaded THEN the stale model is published first, then load runs and its model is returned', async () => {
      const deps = loadDepsMock();
      const publish = vi.fn();

      vi.mocked(deps.readCached).mockResolvedValue(STALE_CACHED_WORKSPACE_STUB);

      const result = await loadRoot('cache-first', deps, new AbortController().signal, publish);

      const stale: LoadedModel = { ...LOADED, fromCache: true, isFresh: false };

      expect(publish).toHaveBeenCalledExactlyOnceWith(stale);
      expect(publish).toHaveBeenCalledBefore(vi.mocked(deps.load));
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

      expect(deps.log).toHaveBeenCalledExactlyOnceWith('turbo io: disk');
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
    it('WHEN it throws a TurboException THEN it is a load failure with that error, not logged', async () => {
      const deps = loadDepsMock();
      const failed = new TurboException('failed', 'turbo exited 1');

      vi.mocked(deps.load).mockRejectedValue(failed);

      const result = await loadRoot('full', deps, new AbortController().signal, vi.fn());

      expect(result).toStrictEqual({ kind: 'error', stage: 'load', error: failed, logText: 'turbo failed: turbo exited 1' });
      expect(deps.log).not.toHaveBeenCalled();
    });

    it('WHEN the TurboException has a cause THEN the result error carries none', async () => {
      const deps = loadDepsMock();
      const stderr = new Error('raw turbo stderr');
      const caused = new TurboException('failed', 'turbo exited 1', { cause: stderr });

      vi.mocked(deps.load).mockRejectedValue(caused);

      const result = await loadRoot('full', deps, new AbortController().signal, vi.fn());

      const withoutCause = { kind: 'failed', message: 'turbo exited 1' };

      expect(result).toMatchObject({ kind: 'error', stage: 'load', error: withoutCause });
      expect(result).not.toHaveProperty('error.cause');
    });

    it('WHEN it throws something else THEN it is wrapped as a failed TurboException', async () => {
      const deps = loadDepsMock();

      vi.mocked(deps.load).mockRejectedValue('plain string');

      const result = await loadRoot('full', deps, new AbortController().signal, vi.fn());

      expect(result).toStrictEqual({
        kind: 'error',
        stage: 'load',
        error: new TurboException('failed', 'plain string'),
        logText: 'plain string'
      });
      expect(deps.log).not.toHaveBeenCalled();
    });
  });
});
