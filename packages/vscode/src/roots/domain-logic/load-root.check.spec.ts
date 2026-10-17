import { TurboException } from '@turbo-console/core';
import type { CachedWorkspace } from '@turbo-console/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { loadRoot } from './load-root.ts';
import type { LoadDeps, LoadResult, LoadedModel } from '../common/root.type.ts';
import { loadDepsMock } from '../test/mocks/load-deps.mock.ts';
import {
  CACHED_WORKSPACE_STUB,
  STALE_CACHED_WORKSPACE_STUB,
  TURBO_BINARY_STUB,
  WORKSPACE_MODEL_STUB
} from '../test/stubs/root.stub.ts';

const LOADED: LoadedModel = {
  kind: 'model',
  binary: TURBO_BINARY_STUB,
  model: WORKSPACE_MODEL_STUB,
  fromCache: false,
  isFresh: true
};

const PUBLISHED: LoadedModel = { ...LOADED, fromCache: true, isFresh: false };

const FRESH_CACHED: LoadedModel = { ...LOADED, fromCache: true };

describe('FEATURE: freshness check of a cached root load', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GIVEN cache-first mode and a freshness check that has not settled', () => {
    let check: PromiseWithResolvers<boolean>;
    let deps: LoadDeps;
    let publish: Mock<(result: LoadedModel) => void>;
    let pending: Promise<LoadResult>;

    beforeEach(() => {
      check = Promise.withResolvers<boolean>();
      deps = loadDepsMock();
      publish = vi.fn();

      const unchecked: CachedWorkspace = { ...CACHED_WORKSPACE_STUB, isFresh: async (): Promise<boolean> => check.promise };

      vi.mocked(deps.readCached).mockResolvedValue(unchecked);
      pending = loadRoot('cache-first', deps, new AbortController().signal, publish);
    });

    it('WHEN the cache is read THEN the cached model is already published from the cache', async () => {
      await vi.waitFor(() => {
        expect(publish).toHaveBeenCalledExactlyOnceWith(PUBLISHED);
      });
      check.resolve(true);
      await pending;
    });

    it('WHEN the check finds it stale THEN load runs once and its model is returned', async () => {
      check.resolve(false);

      const result = await pending;

      expect(deps.load).toHaveBeenCalledOnce();
      expect(result).toStrictEqual(LOADED);
    });

    it('WHEN the check finds it fresh THEN load never runs and the cached model is returned fresh', async () => {
      check.resolve(true);

      const result = await pending;

      expect(deps.load).not.toHaveBeenCalled();
      expect(result).toStrictEqual(FRESH_CACHED);
    });

    it('WHEN the check throws THEN the error is logged after the publish and load runs', async () => {
      check.reject(new TurboException('io', 'hash'));

      const result = await pending;

      expect(publish).toHaveBeenCalledExactlyOnceWith(PUBLISHED);
      expect(deps.log).toHaveBeenCalledExactlyOnceWith('turbo io: hash');
      expect(deps.load).toHaveBeenCalledOnce();
      expect(result).toStrictEqual(LOADED);
    });
  });

  describe('GIVEN a published cached model whose freshness check hangs and the caller aborts', () => {
    it('WHEN the check never settles THEN it is a load failure, published once, and nothing is logged or loaded', async () => {
      const deps = loadDepsMock();
      const controller = new AbortController();
      const publish = vi.fn();
      const hanging: CachedWorkspace = {
        ...STALE_CACHED_WORKSPACE_STUB,
        isFresh: async (): Promise<boolean> => new Promise(() => undefined)
      };

      vi.mocked(deps.readCached).mockResolvedValue(hanging);

      const pending = loadRoot('cache-first', deps, controller.signal, publish);

      await vi.waitFor(() => {
        expect(publish).toHaveBeenCalledOnce();
      });
      controller.abort();

      const result = await pending;

      expect(result).toMatchObject({ kind: 'error', stage: 'load' });
      expect(publish).toHaveBeenCalledOnce();
      expect(deps.log).not.toHaveBeenCalled();
      expect(deps.acquire).not.toHaveBeenCalled();
      expect(deps.load).not.toHaveBeenCalled();
    });

    it('WHEN the check then throws THEN that throw is not logged', async () => {
      const deps = loadDepsMock();
      const controller = new AbortController();
      const publish = vi.fn();
      const check = Promise.withResolvers<boolean>();
      const checked: CachedWorkspace = { ...STALE_CACHED_WORKSPACE_STUB, isFresh: async (): Promise<boolean> => check.promise };

      vi.mocked(deps.readCached).mockResolvedValue(checked);

      const pending = loadRoot('cache-first', deps, controller.signal, publish);

      await vi.waitFor(() => {
        expect(publish).toHaveBeenCalledOnce();
      });
      controller.abort();
      check.reject(new Error('io'));

      const result = await pending;

      expect(result).toMatchObject({ kind: 'error', stage: 'load' });
      expect(deps.log).not.toHaveBeenCalled();
    });
  });
});
