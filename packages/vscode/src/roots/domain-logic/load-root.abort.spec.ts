import { TurboException } from '@turbo-console/core';
import type { CachedWorkspace } from '@turbo-console/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadRoot } from './load-root.ts';
import { LOAD_DEADLINE_MS, LOAD_GRACE_MS } from '../common/roots.const.ts';
import { loadDepsMock } from '../test/mocks/load-deps.mock.ts';
import { STALE_CACHED_WORKSPACE_STUB, TURBO_BINARY_STUB, WORKSPACE_MODEL_STUB } from '../test/stubs/root.stub.ts';
import { acquireUntilAborted } from '../test/utils/abortable-acquire.spec.util.ts';
import { loadUntilAborted } from '../test/utils/abortable-load.spec.util.ts';

describe('FEATURE: abort, deadline and load slot of a root load', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GIVEN the caller aborts while load runs', () => {
    it('WHEN the load settles THEN it is a load failure and nothing is logged', async () => {
      const deps = loadDepsMock();
      const controller = new AbortController();

      vi.mocked(deps.load).mockImplementation(loadUntilAborted);

      const pending = loadRoot('full', deps, controller.signal, vi.fn());

      await vi.waitFor(() => {
        expect(deps.load).toHaveBeenCalledOnce();
      });
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
  });

  describe('GIVEN the deadline expires while load runs', () => {
    it('WHEN the timeout fires THEN the error of the load itself is the failure, logged, and the timeout was LOAD_DEADLINE_MS', async () => {
      const deps = loadDepsMock();
      const expiry = new AbortController();
      const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValueOnce(expiry.signal);

      vi.mocked(deps.load).mockImplementation(loadUntilAborted);

      const pending = loadRoot('full', deps, new AbortController().signal, vi.fn());

      await vi.waitFor(() => {
        expect(deps.load).toHaveBeenCalledOnce();
      });
      expiry.abort(new DOMException('t', 'TimeoutError'));

      const result = await pending;

      const loadError = { message: 'aborted' };

      expect(result).toMatchObject({ kind: 'error', stage: 'load', error: loadError });
      expect(deps.log).toHaveBeenCalledExactlyOnceWith('aborted');
      expect(timeout).toHaveBeenNthCalledWith(1, LOAD_DEADLINE_MS);
      expect(timeout).toHaveBeenNthCalledWith(2, LOAD_DEADLINE_MS + LOAD_GRACE_MS);
    });

    it('WHEN load ignores the deadline THEN the backstop ends it as a logged load failure and frees the slot', async () => {
      const deps = loadDepsMock();
      const release = vi.fn();
      const backstop = new AbortController();
      const timeout = vi.spyOn(AbortSignal, 'timeout');

      timeout.mockReturnValueOnce(new AbortController().signal).mockReturnValueOnce(backstop.signal);
      vi.mocked(deps.acquire).mockResolvedValue(release);
      vi.mocked(deps.load).mockReturnValue(new Promise(() => undefined));

      const pending = loadRoot('full', deps, new AbortController().signal, vi.fn());

      await vi.waitFor(() => {
        expect(deps.load).toHaveBeenCalledOnce();
      });
      backstop.abort(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));

      const result = await pending;

      const abandoned = new TurboException('failed', 'load still running 15 s past its 60 s deadline; abandoned');

      expect(result).toStrictEqual({ kind: 'error', stage: 'load', error: abandoned });
      expect(deps.log).toHaveBeenCalledExactlyOnceWith(
        'turbo failed: load still running 15 s past its 60 s deadline; abandoned'
      );
      expect(release).toHaveBeenCalledOnce();
    });

    it('WHEN the slot is acquired THEN the timeout is created only after acquire resolves', async () => {
      const deps = loadDepsMock();
      const slot = Promise.withResolvers<() => void>();
      const timeout = vi.spyOn(AbortSignal, 'timeout');

      vi.mocked(deps.acquire).mockReturnValue(slot.promise);

      const pending = loadRoot('full', deps, new AbortController().signal, vi.fn());

      await vi.waitFor(() => {
        expect(deps.acquire).toHaveBeenCalledOnce();
      });

      expect(timeout).not.toHaveBeenCalled();

      slot.resolve(vi.fn<() => void>());
      await pending;

      expect(timeout).toHaveBeenNthCalledWith(1, LOAD_DEADLINE_MS);
    });
  });

  describe('GIVEN a port hangs and the caller aborts', () => {
    it('WHEN the cache read never settles THEN it is a load failure and nothing is logged', async () => {
      const deps = loadDepsMock();
      const controller = new AbortController();

      vi.mocked(deps.readCached).mockReturnValue(new Promise(() => undefined));

      const pending = loadRoot('cache-first', deps, controller.signal, vi.fn());

      await vi.waitFor(() => {
        expect(deps.readCached).toHaveBeenCalledOnce();
      });
      controller.abort();

      const result = await pending;

      expect(result).toMatchObject({ kind: 'error', stage: 'load' });
      expect(deps.log).not.toHaveBeenCalled();
      expect(deps.progress).not.toHaveBeenCalled();
      expect(deps.load).not.toHaveBeenCalled();
    });

    it('WHEN progress never settles THEN it is a load failure and nothing is logged', async () => {
      const deps = loadDepsMock();
      const controller = new AbortController();

      vi.mocked(deps.progress).mockReturnValue(new Promise(() => undefined));

      const pending = loadRoot('full', deps, controller.signal, vi.fn());

      await vi.waitFor(() => {
        expect(deps.progress).toHaveBeenCalledOnce();
      });
      controller.abort(new Error('superseded'));

      const result = await pending;

      const callerReason = { message: 'superseded' };

      expect(result).toMatchObject({ kind: 'error', stage: 'load', error: callerReason });
      expect(deps.log).not.toHaveBeenCalled();
    });

    it('WHEN the cache read then throws THEN that throw is not logged', async () => {
      const deps = loadDepsMock();
      const controller = new AbortController();
      const read = Promise.withResolvers<CachedWorkspace | null>();

      vi.mocked(deps.readCached).mockReturnValue(read.promise);

      const pending = loadRoot('cache-first', deps, controller.signal, vi.fn());

      await vi.waitFor(() => {
        expect(deps.readCached).toHaveBeenCalledOnce();
      });
      controller.abort();
      read.reject(new Error('io'));

      const result = await pending;

      expect(result).toMatchObject({ kind: 'error', stage: 'load' });
      expect(deps.log).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN the caller aborts as the cached model becomes ready', () => {
    it('WHEN it would be published THEN nothing is published, nothing is logged and it is a load failure', async () => {
      const deps = loadDepsMock();
      const controller = new AbortController();
      const publish = vi.fn();
      // The abort sits in the getter: loadRoot reads isFresh after the cache read settles and before its abort check,
      // the only point where an abort meets a non-null cache. A queued microtask abort loses to the read's own race.
      const abortsWhenRead: CachedWorkspace = {
        model: WORKSPACE_MODEL_STUB,
        get isFresh(): boolean {
          controller.abort();

          return true;
        }
      };

      vi.mocked(deps.readCached).mockResolvedValue(abortsWhenRead);

      const result = await loadRoot('cache-first', deps, controller.signal, publish);

      expect(result).toMatchObject({ kind: 'error', stage: 'load' });
      expect(publish).not.toHaveBeenCalled();
      expect(deps.log).not.toHaveBeenCalled();
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

  describe('GIVEN the caller aborts during the cache read', () => {
    it('WHEN the read still returns a model THEN nothing is published, logged or loaded', async () => {
      const deps = loadDepsMock();
      const controller = new AbortController();
      const publish = vi.fn();

      vi.mocked(deps.readCached).mockImplementation(async () => {
        controller.abort();

        return Promise.resolve(STALE_CACHED_WORKSPACE_STUB);
      });

      const result = await loadRoot('cache-first', deps, controller.signal, publish);

      expect(result).toMatchObject({ kind: 'error', stage: 'load' });
      expect(publish).not.toHaveBeenCalled();
      expect(deps.log).not.toHaveBeenCalled();
      expect(deps.progress).not.toHaveBeenCalled();
      expect(deps.acquire).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN the caller aborts while resolve settles', () => {
    it('WHEN resolve returns a binary THEN it is a load failure and no later port runs', async () => {
      const deps = loadDepsMock();
      const controller = new AbortController();

      vi.mocked(deps.resolve).mockImplementation(async () => {
        controller.abort();

        return Promise.resolve(TURBO_BINARY_STUB);
      });

      const result = await loadRoot('cache-first', deps, controller.signal, vi.fn());

      expect(result).toMatchObject({ kind: 'error', stage: 'load' });
      expect(deps.readCached).not.toHaveBeenCalled();
      expect(deps.acquire).not.toHaveBeenCalled();
      expect(deps.log).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN the load slot', () => {
    it('WHEN the load succeeds THEN the slot is released once', async () => {
      const deps = loadDepsMock();
      const release = vi.fn();

      vi.mocked(deps.acquire).mockResolvedValue(release);

      await loadRoot('full', deps, new AbortController().signal, vi.fn());

      expect(release).toHaveBeenCalledOnce();
      expect(deps.acquire).toHaveBeenCalledExactlyOnceWith(expect.any(AbortSignal));
    });

    it('WHEN the load fails THEN the slot is released once', async () => {
      const deps = loadDepsMock();
      const release = vi.fn();

      vi.mocked(deps.acquire).mockResolvedValue(release);
      vi.mocked(deps.load).mockRejectedValue(new Error('boom'));

      await loadRoot('full', deps, new AbortController().signal, vi.fn());

      expect(release).toHaveBeenCalledOnce();
    });

    it('WHEN the caller aborts during the load THEN the slot is released once', async () => {
      const deps = loadDepsMock();
      const controller = new AbortController();
      const release = vi.fn();

      vi.mocked(deps.acquire).mockResolvedValue(release);
      vi.mocked(deps.progress).mockReturnValue(new Promise(() => undefined));

      const pending = loadRoot('full', deps, controller.signal, vi.fn());

      await vi.waitFor(() => {
        expect(deps.progress).toHaveBeenCalledOnce();
      });
      controller.abort();
      await pending;

      expect(release).toHaveBeenCalledOnce();
    });

    it('WHEN the caller aborts while queued THEN progress and load never run and nothing is logged or published', async () => {
      const deps = loadDepsMock();
      const controller = new AbortController();
      const publish = vi.fn();

      vi.mocked(deps.acquire).mockImplementation(acquireUntilAborted);

      const pending = loadRoot('full', deps, controller.signal, publish);

      await vi.waitFor(() => {
        expect(deps.acquire).toHaveBeenCalledOnce();
      });
      controller.abort();

      const result = await pending;

      expect(result).toMatchObject({ kind: 'error', stage: 'load' });
      expect(publish).not.toHaveBeenCalled();
      expect(deps.progress).not.toHaveBeenCalled();
      expect(deps.load).not.toHaveBeenCalled();
      expect(deps.log).not.toHaveBeenCalled();
    });

    it('WHEN acquire rejects without an abort THEN it is a logged load failure and nothing runs', async () => {
      const deps = loadDepsMock();

      vi.mocked(deps.acquire).mockRejectedValue(new Error('queue broken'));

      const result = await loadRoot('full', deps, new AbortController().signal, vi.fn());

      expect(result).toStrictEqual({ kind: 'error', stage: 'load', error: new TurboException('failed', 'queue broken') });
      expect(deps.log).toHaveBeenCalledExactlyOnceWith('queue broken');
      expect(deps.progress).not.toHaveBeenCalled();
    });

    it('WHEN release throws THEN the load result still returns and the error is logged', async () => {
      const deps = loadDepsMock();
      const release = vi.fn(() => {
        throw new Error('slot gone');
      });

      vi.mocked(deps.acquire).mockResolvedValue(release);

      const result = await loadRoot('full', deps, new AbortController().signal, vi.fn());

      expect(result).toMatchObject({ kind: 'model', fromCache: false });
      expect(deps.log).toHaveBeenCalledExactlyOnceWith('slot gone');
    });
  });
});
