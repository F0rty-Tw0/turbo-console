import type { CachedWorkspace } from '@turbo-console/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadRoot } from './load-root.ts';
import { CACHE_DEADLINE_MS } from '../common/roots.const.ts';
import { loadDepsMock } from '../test/mocks/load-deps.mock.ts';
import { STALE_CACHED_WORKSPACE_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/root.stub.ts';

describe('FEATURE: deadline of the cache steps of a root load', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GIVEN a cache step that outlives CACHE_DEADLINE_MS', () => {
    it('WHEN the cache read never settles THEN it gives up, logs once, and the full load runs', async () => {
      const deps = loadDepsMock();
      const expiry = new AbortController();
      const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValueOnce(expiry.signal);

      vi.mocked(deps.readCached).mockReturnValue(new Promise(() => undefined));

      const pending = loadRoot('cache-first', deps, new AbortController().signal, vi.fn());

      await vi.waitFor(() => {
        expect(deps.readCached).toHaveBeenCalledOnce();
      });
      expiry.abort(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));

      const result = await pending;

      expect(timeout).toHaveBeenNthCalledWith(1, CACHE_DEADLINE_MS);
      expect(deps.log).toHaveBeenCalledExactlyOnceWith('cache check still running after 3 s; loading without the cache');
      expect(deps.load).toHaveBeenCalledOnce();
      expect(result).toMatchObject({ kind: 'model', model: WORKSPACE_MODEL_STUB, fromCache: false, isFresh: true });
    });

    it('WHEN the freshness check never settles THEN it gives up, logs once, and the full load runs', async () => {
      const deps = loadDepsMock();
      const publish = vi.fn();
      const expiry = new AbortController();
      const timeout = vi.spyOn(AbortSignal, 'timeout');
      const hanging: CachedWorkspace = {
        ...STALE_CACHED_WORKSPACE_STUB,
        isFresh: async (): Promise<boolean> => new Promise(() => undefined)
      };

      timeout.mockReturnValueOnce(new AbortController().signal).mockReturnValueOnce(expiry.signal);
      vi.mocked(deps.readCached).mockResolvedValue(hanging);

      const pending = loadRoot('cache-first', deps, new AbortController().signal, publish);

      await vi.waitFor(() => {
        expect(publish).toHaveBeenCalledTimes(2);
      });
      expiry.abort(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));

      const result = await pending;

      expect(timeout).toHaveBeenNthCalledWith(2, CACHE_DEADLINE_MS);
      expect(deps.log).toHaveBeenCalledExactlyOnceWith('cache check still running after 3 s; loading without the cache');
      expect(deps.load).toHaveBeenCalledOnce();
      expect(result).toMatchObject({ kind: 'model', fromCache: false, isFresh: true });
    });
  });
});
