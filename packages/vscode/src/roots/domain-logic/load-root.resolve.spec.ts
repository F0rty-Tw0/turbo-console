import { TurboException } from '@turbo-console/core';
import type { CachedWorkspace, TurboBinary } from '@turbo-console/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { loadRoot } from './load-root.ts';
import type { LoadDeps, LoadResult, LoadedModel } from '../common/root.type.ts';
import { loadDepsMock } from '../test/mocks/load-deps.mock.ts';
import { CACHED_WORKSPACE_STUB, TURBO_BINARY_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/root.stub.ts';
import { flushSettles } from '../test/utils/deferred-ports.spec.util.ts';
import { loadFailureOf } from '../test/utils/load-failure.spec.util.ts';

const PUBLISHED: LoadedModel = { kind: 'model', binary: null, model: WORKSPACE_MODEL_STUB, fromCache: true, isFresh: false };

const FRESH_CACHED: LoadedModel = { ...PUBLISHED, binary: TURBO_BINARY_STUB, isFresh: true };

const NOT_FOUND = new TurboException('not-found', 'no turbo');

describe('FEATURE: cached publish of a root load while its binary resolves', () => {
  let resolving: PromiseWithResolvers<TurboBinary>;
  let deps: LoadDeps;
  let publish: Mock<(result: LoadedModel) => void>;

  beforeEach(() => {
    resolving = Promise.withResolvers<TurboBinary>();
    deps = loadDepsMock();
    publish = vi.fn();
    vi.mocked(deps.resolve).mockReturnValue(resolving.promise);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GIVEN cache-first mode, a fresh cache and a resolve that has not settled', () => {
    let pending: Promise<LoadResult>;

    beforeEach(() => {
      pending = loadRoot('cache-first', deps, new AbortController().signal, publish);
    });

    it('WHEN the cache is read THEN the cached model is published with no binary yet', async () => {
      await vi.waitFor(() => {
        expect(publish).toHaveBeenCalledExactlyOnceWith(PUBLISHED);
      });
      resolving.resolve(TURBO_BINARY_STUB);
      await pending;
    });

    it('WHEN resolve then returns the binary THEN the cached model is returned fresh with that binary', async () => {
      resolving.resolve(TURBO_BINARY_STUB);

      const result = await pending;

      expect(result).toStrictEqual(FRESH_CACHED);
      expect(deps.load).not.toHaveBeenCalled();
    });

    it('WHEN resolve then returns the binary THEN the cached model is published again with that binary before its check', async () => {
      resolving.resolve(TURBO_BINARY_STUB);
      await pending;

      expect(publish.mock.calls).toStrictEqual([[PUBLISHED], [{ ...PUBLISHED, binary: TURBO_BINARY_STUB }]]);
    });

    it('WHEN resolve then rejects THEN it is a binary failure after the publish, and load never runs', async () => {
      await vi.waitFor(() => {
        expect(publish).toHaveBeenCalledOnce();
      });
      resolving.reject(NOT_FOUND);

      const result = await pending;

      expect(result).toStrictEqual(loadFailureOf('binary', NOT_FOUND));
      expect(publish).toHaveBeenCalledExactlyOnceWith(PUBLISHED);
      expect(deps.load).not.toHaveBeenCalled();
      expect(deps.log).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN cache-first mode and a cache read that has not returned', () => {
    let reading: PromiseWithResolvers<CachedWorkspace | null>;

    beforeEach(() => {
      reading = Promise.withResolvers<CachedWorkspace | null>();
      vi.mocked(deps.readCached).mockReturnValue(reading.promise);
    });

    it('WHEN resolve rejects and the read never returns THEN it is the binary failure, with nothing published', async () => {
      resolving.reject(NOT_FOUND);

      const result = await loadRoot('cache-first', deps, new AbortController().signal, publish);

      expect(result).toStrictEqual(loadFailureOf('binary', NOT_FOUND));
      expect(publish).not.toHaveBeenCalled();
    });

    it('WHEN resolve rejects and the read returns later THEN it is the binary failure, with nothing published', async () => {
      const pending = loadRoot('cache-first', deps, new AbortController().signal, publish);

      await vi.waitFor(() => {
        expect(deps.readCached).toHaveBeenCalledOnce();
      });
      resolving.reject(NOT_FOUND);
      await flushSettles();
      reading.resolve(CACHED_WORKSPACE_STUB);

      const result = await pending;

      await flushSettles();

      expect(result).toStrictEqual(loadFailureOf('binary', NOT_FOUND));
      expect(publish).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN cache-first mode and a cache whose freshness check is spied on', () => {
    it('WHEN loaded THEN the check gets the resolved binary', async () => {
      const isFresh = vi.fn<CachedWorkspace['isFresh']>().mockResolvedValue(true);
      const checked: CachedWorkspace = { ...CACHED_WORKSPACE_STUB, isFresh };

      vi.mocked(deps.readCached).mockResolvedValue(checked);
      resolving.resolve(TURBO_BINARY_STUB);
      await loadRoot('cache-first', deps, new AbortController().signal, publish);

      expect(isFresh).toHaveBeenCalledExactlyOnceWith(TURBO_BINARY_STUB);
    });
  });

  describe('GIVEN cache-first mode, a cached model published and a resolve that has not settled', () => {
    it('WHEN the caller aborts and resolve then returns the binary THEN nothing is published again and it is a load failure', async () => {
      const controller = new AbortController();
      const pending = loadRoot('cache-first', deps, controller.signal, publish);

      await vi.waitFor(() => {
        expect(publish).toHaveBeenCalledOnce();
      });
      controller.abort();
      resolving.resolve(TURBO_BINARY_STUB);

      const result = await pending;

      expect(result).toMatchObject({ kind: 'error', stage: 'load' });
      expect(publish).toHaveBeenCalledExactlyOnceWith(PUBLISHED);
    });
  });

  describe('GIVEN cache-first mode, no cache and a resolve that has not settled', () => {
    it('WHEN the caller aborts and resolve then returns the binary THEN it is a load failure and no slot is taken', async () => {
      const controller = new AbortController();

      vi.mocked(deps.readCached).mockResolvedValue(null);

      const pending = loadRoot('cache-first', deps, controller.signal, publish);

      await vi.waitFor(() => {
        expect(deps.readCached).toHaveBeenCalledOnce();
      });
      await flushSettles();
      controller.abort();
      resolving.resolve(TURBO_BINARY_STUB);

      const result = await pending;

      expect(result).toMatchObject({ kind: 'error', stage: 'load' });
      expect(deps.acquire).not.toHaveBeenCalled();
      expect(publish).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN cache-first mode, a resolve that has not settled and the caller aborts during the cache read', () => {
    it('WHEN resolve then rejects THEN it is a load failure, nothing is published and no rejection goes unhandled', async () => {
      const controller = new AbortController();
      const unhandled = vi.fn();

      process.on('unhandledRejection', unhandled);
      vi.mocked(deps.readCached).mockReturnValue(new Promise(() => undefined));

      const pending = loadRoot('cache-first', deps, controller.signal, publish);

      await vi.waitFor(() => {
        expect(deps.readCached).toHaveBeenCalledOnce();
      });
      controller.abort();

      const result = await pending;

      resolving.reject(NOT_FOUND);
      await flushSettles();
      process.off('unhandledRejection', unhandled);

      expect(result).toMatchObject({ kind: 'error', stage: 'load' });
      expect(publish).not.toHaveBeenCalled();
      expect(unhandled).not.toHaveBeenCalled();
    });
  });
});
