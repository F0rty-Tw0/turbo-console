import type { CachedWorkspace } from '@turbo-console/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LoadCoordinator } from './load-coordinator.ts';
import { loadRoot } from './load-root.ts';
import type { CoordinatorPorts } from '../common/coordinator.type.ts';
import { CACHE_DEADLINE_MS } from '../common/roots.const.ts';
import { loadDepsMock } from '../test/mocks/load-deps.mock.ts';
import { STALE_CACHED_WORKSPACE_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/root.stub.ts';

const READ_EXPIRED = 'cache read still running after 10 s; loading without the cache';

const CHECK_EXPIRED = 'freshness check still running after 10 s; loading without the cache';

const timeoutError = (): DOMException => new DOMException('The operation was aborted due to timeout', 'TimeoutError');

/** A cached workspace whose freshness check settles only through `check`, as a hash stuck on a hung mount. */
const cachedWith = (check: Promise<boolean>): CachedWorkspace => {
  const cached: CachedWorkspace = { ...STALE_CACHED_WORKSPACE_STUB, isFresh: async (): Promise<boolean> => check };

  return cached;
};

describe('FEATURE: deadline of the cache steps of a root load', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GIVEN a cache step that outlives CACHE_DEADLINE_MS', () => {
    it('WHEN the cache read never settles THEN it gives up, logs once naming the read, and the full load runs', async () => {
      const deps = loadDepsMock();
      const expiry = new AbortController();
      const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValueOnce(expiry.signal);

      vi.mocked(deps.readCached).mockReturnValue(new Promise(() => undefined));

      const pending = loadRoot('cache-first', deps, new AbortController().signal, vi.fn());

      await vi.waitFor(() => {
        expect(deps.readCached).toHaveBeenCalledOnce();
      });
      expiry.abort(timeoutError());

      const result = await pending;

      expect(timeout).toHaveBeenNthCalledWith(1, CACHE_DEADLINE_MS);
      expect(deps.log).toHaveBeenCalledExactlyOnceWith(READ_EXPIRED);
      expect(deps.load).toHaveBeenCalledOnce();
      expect(result).toMatchObject({ kind: 'model', model: WORKSPACE_MODEL_STUB, fromCache: false, isFresh: true });
    });

    it('WHEN the freshness check never settles THEN it gives up, logs once naming the check, and the full load runs', async () => {
      const deps = loadDepsMock();
      const publish = vi.fn();
      const expiry = new AbortController();
      const timeout = vi.spyOn(AbortSignal, 'timeout');

      timeout.mockReturnValueOnce(new AbortController().signal).mockReturnValueOnce(expiry.signal);
      vi.mocked(deps.readCached).mockResolvedValue(cachedWith(new Promise(() => undefined)));

      const pending = loadRoot('cache-first', deps, new AbortController().signal, publish);

      await vi.waitFor(() => {
        expect(publish).toHaveBeenCalledTimes(2);
      });
      expiry.abort(timeoutError());

      const result = await pending;

      expect(timeout).toHaveBeenNthCalledWith(2, CACHE_DEADLINE_MS);
      expect(deps.log).toHaveBeenCalledExactlyOnceWith(CHECK_EXPIRED);
      expect(deps.load).toHaveBeenCalledOnce();
      expect(result).toMatchObject({ kind: 'model', fromCache: false, isFresh: true });
    });

    it('WHEN the check passes only after it gave up THEN that late answer is ignored: no third publish, the full load wins', async () => {
      const deps = loadDepsMock();
      const publish = vi.fn();
      const expiry = new AbortController();
      const check = Promise.withResolvers<boolean>();
      const timeout = vi.spyOn(AbortSignal, 'timeout');

      timeout.mockReturnValueOnce(new AbortController().signal).mockReturnValueOnce(expiry.signal);
      vi.mocked(deps.readCached).mockResolvedValue(cachedWith(check.promise));

      const pending = loadRoot('cache-first', deps, new AbortController().signal, publish);

      await vi.waitFor(() => {
        expect(publish).toHaveBeenCalledTimes(2);
      });
      expiry.abort(timeoutError());
      check.resolve(true);

      const result = await pending;

      expect(publish).toHaveBeenCalledTimes(2);
      expect(result).toMatchObject({ kind: 'model', fromCache: false });
    });
  });

  describe('GIVEN a coordinator whose cache-first load runs the real loadRoot with a hung freshness check', () => {
    it('WHEN the check gives up THEN whenSettled resolves and the full load result is applied', async () => {
      const deps = loadDepsMock();
      const expiry = new AbortController();
      const timeout = vi.spyOn(AbortSignal, 'timeout');
      const ports: CoordinatorPorts = {
        run: async (mode, signal, publish) => loadRoot(mode, deps, signal, publish),
        isVisible: () => true,
        apply: vi.fn(),
        record: vi.fn(),
        now: () => 0
      };
      const coordinator = new LoadCoordinator(ports);

      timeout.mockReturnValueOnce(new AbortController().signal).mockReturnValueOnce(expiry.signal);
      vi.mocked(deps.readCached).mockResolvedValue(cachedWith(new Promise(() => undefined)));
      coordinator.show();

      await vi.waitFor(() => {
        expect(ports.apply).toHaveBeenCalledTimes(2);
      });
      expiry.abort(timeoutError());
      await coordinator.whenSettled();

      expect(ports.apply).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'model', fromCache: false }));
    });
  });
});
