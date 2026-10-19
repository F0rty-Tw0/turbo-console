import { TurboException } from '@turbo-console/core';
import type { WorkspaceModel } from '@turbo-console/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoadCoordinator } from './load-coordinator.ts';
import type { LoadFailure, LoadedModel } from '../common/root.type.ts';
import type { DeferredPorts } from '../test/common/coordinator.type.ts';
import { LOADED_MODEL_STUB, LOAD_FAILURE_STUB } from '../test/stubs/root.stub.ts';
import { deferredPorts, flushSettles, runAt } from '../test/utils/deferred-ports.spec.util.ts';
import { loadFailureOf } from '../test/utils/load-failure.spec.util.ts';

const STALE_CACHED: LoadedModel = { ...LOADED_MODEL_STUB, fromCache: true, isFresh: false };
/** What `loadRoot` publishes before the freshness check, and what it returns once the check passed. */
const UNCHECKED_CACHED: LoadedModel = { ...LOADED_MODEL_STUB, binary: null, fromCache: true, isFresh: false };
/** What `loadRoot` publishes again once the binary resolved, before the freshness check. */
const BOUND_CACHED: LoadedModel = { ...UNCHECKED_CACHED, binary: LOADED_MODEL_STUB.binary };
const FRESH_CACHED: LoadedModel = { ...LOADED_MODEL_STUB, fromCache: true, isFresh: true };
const OTHER_MODEL: WorkspaceModel = { ...LOADED_MODEL_STUB.model, warnings: ['other'] };
const OTHER_CACHED: LoadedModel = { ...FRESH_CACHED, model: OTHER_MODEL };
const ABORT_ERROR = new TurboException('failed', 'This operation was aborted');
const ABORTED: LoadFailure = loadFailureOf('load', ABORT_ERROR);
const RUN_ERROR = new TurboException('failed', 'boom');
/** What `runFailureOf` makes of the plain `Error('boom')` the port throws: its line is the bare message. */
const RUN_FAILED: LoadFailure = { kind: 'error', stage: 'load', error: RUN_ERROR, logText: 'boom' };

const throwBoom = (): never => {
  throw new Error('boom');
};

describe('FEATURE: settling a root load', () => {
  let deferred: DeferredPorts;
  let coordinator: LoadCoordinator;

  beforeEach(() => {
    deferred = deferredPorts();
    coordinator = new LoadCoordinator(deferred.ports);
  });

  describe('GIVEN a run port that rejects', () => {
    beforeEach(async () => {
      vi.mocked(deferred.ports.run).mockRejectedValueOnce(new Error('boom'));
      coordinator.show();
      await flushSettles();
    });

    it('WHEN waiting for settled THEN it resolves', async () => {
      await coordinator.whenSettled();

      expect(deferred.ports.run).toHaveBeenCalledOnce();
    });

    it('WHEN the rejection settles THEN it is applied as a failed load', () => {
      expect(deferred.ports.apply).toHaveBeenCalledExactlyOnceWith(RUN_FAILED);
    });

    it('WHEN ensured afterwards THEN one full load of its own starts', () => {
      void coordinator.ensureLoaded();

      expect(deferred.runs.map((run) => run.mode)).toStrictEqual(['full']);
    });
  });

  describe('GIVEN a run port that throws synchronously', () => {
    beforeEach(() => {
      vi.mocked(deferred.ports.run).mockImplementationOnce(throwBoom);
    });

    it('WHEN a refresh request starts it THEN the request does not throw', () => {
      const refresh = (): void => {
        coordinator.request('refresh');
      };

      expect(refresh).not.toThrow();
    });

    it('WHEN it settles THEN the failure is applied and whenSettled resolves', async () => {
      coordinator.request('refresh');
      await coordinator.whenSettled();

      expect(deferred.ports.apply).toHaveBeenCalledExactlyOnceWith(RUN_FAILED);
    });

    it('WHEN ensured afterwards THEN one full load of its own starts', async () => {
      coordinator.show();
      await flushSettles();
      void coordinator.ensureLoaded();

      expect(deferred.runs.map((run) => run.mode)).toStrictEqual(['full']);
    });
  });

  it('GIVEN a show during a load superseded by a visible request WHEN a hidden request aborts the newer load THEN no follow-up starts', async () => {
    coordinator.show();
    coordinator.show();
    deferred.setVisible(true);
    coordinator.request('watch');
    deferred.setVisible(false);
    coordinator.request('watch');
    runAt(deferred, 0).settle(ABORTED);
    runAt(deferred, 1).settle(ABORTED);
    await flushSettles();

    expect(deferred.runs).toHaveLength(2);
  });

  it('GIVEN a hidden request aborts a load WHEN the view turns visible without show before it settles THEN one full load follows', async () => {
    coordinator.show();
    coordinator.request('watch');
    deferred.setVisible(true);
    runAt(deferred, 0).settle(ABORTED);
    await flushSettles();

    expect(deferred.runs.map((run) => run.mode)).toStrictEqual(['cache-first', 'full']);
  });

  it('GIVEN a cache-first load that publishes a stale cache WHEN it settles with a model THEN its record reads no fresh cache', async () => {
    coordinator.show();

    const record = vi.mocked(deferred.ports.record).mock.calls[0]?.[0];

    runAt(deferred, 0).publish(STALE_CACHED);
    runAt(deferred, 0).settle(LOADED_MODEL_STUB);
    await flushSettles();

    expect(record).toMatchObject({ outcome: 'model', cacheFresh: false });
  });

  describe('GIVEN a cache-first load that publishes a cache before its freshness check', () => {
    beforeEach(() => {
      coordinator.show();
      runAt(deferred, 0).publish(UNCHECKED_CACHED);
    });

    it('WHEN the load returns it checked fresh with its binary THEN that result is applied after the publish', async () => {
      runAt(deferred, 0).settle(FRESH_CACHED);
      await flushSettles();

      expect(vi.mocked(deferred.ports.apply).mock.calls).toStrictEqual([[UNCHECKED_CACHED], [FRESH_CACHED]]);
    });

    it('WHEN the load returns a binary failure THEN the failure is applied after the publish', async () => {
      runAt(deferred, 0).settle(LOAD_FAILURE_STUB);
      await flushSettles();

      expect(vi.mocked(deferred.ports.apply).mock.calls).toStrictEqual([[UNCHECKED_CACHED], [LOAD_FAILURE_STUB]]);
    });

    it('WHEN the load returns a binary failure and the root is ensured THEN one full load retries it', async () => {
      runAt(deferred, 0).settle(LOAD_FAILURE_STUB);
      await flushSettles();
      void coordinator.ensureLoaded();

      expect(deferred.runs.map((run) => run.mode)).toStrictEqual(['cache-first', 'full']);
    });

    it('WHEN the load returns it checked fresh THEN its record reads a fresh cache', async () => {
      const record = vi.mocked(deferred.ports.record).mock.calls[0]?.[0];

      runAt(deferred, 0).settle(FRESH_CACHED);
      await flushSettles();

      expect(record).toStrictEqual({ mode: 'cache-first', startedAt: 1_000, outcome: 'model', cacheFresh: true });
    });
  });

  describe('GIVEN a cache-first load that publishes a cache before and after its binary resolves', () => {
    beforeEach(() => {
      coordinator.show();
      runAt(deferred, 0).publish(UNCHECKED_CACHED);
      runAt(deferred, 0).publish(BOUND_CACHED);
    });

    it('WHEN the load returns that model checked fresh THEN it is not applied a third time', async () => {
      runAt(deferred, 0).settle(FRESH_CACHED);
      await flushSettles();

      expect(vi.mocked(deferred.ports.apply).mock.calls).toStrictEqual([[UNCHECKED_CACHED], [BOUND_CACHED]]);
    });

    it('WHEN the load returns that model checked fresh THEN its record reads a fresh cache', async () => {
      const record = vi.mocked(deferred.ports.record).mock.calls[0]?.[0];

      runAt(deferred, 0).settle(FRESH_CACHED);
      await flushSettles();

      expect(record).toStrictEqual({ mode: 'cache-first', startedAt: 1_000, outcome: 'model', cacheFresh: true });
    });

    it('WHEN the load returns another cached model THEN that model is applied', async () => {
      runAt(deferred, 0).settle(OTHER_CACHED);
      await flushSettles();

      expect(vi.mocked(deferred.ports.apply).mock.calls).toStrictEqual([[UNCHECKED_CACHED], [BOUND_CACHED], [OTHER_CACHED]]);
    });

    it('WHEN the cache was stale and the full load returns a model THEN that model is applied', async () => {
      runAt(deferred, 0).settle(LOADED_MODEL_STUB);
      await flushSettles();

      expect(vi.mocked(deferred.ports.apply).mock.calls).toStrictEqual([[UNCHECKED_CACHED], [BOUND_CACHED], [LOADED_MODEL_STUB]]);
    });

    it('WHEN the full load fails THEN the failure is applied', async () => {
      runAt(deferred, 0).settle(RUN_FAILED);
      await flushSettles();

      expect(vi.mocked(deferred.ports.apply).mock.calls).toStrictEqual([[UNCHECKED_CACHED], [BOUND_CACHED], [RUN_FAILED]]);
    });
  });

  describe('GIVEN a loaded root whose reload after a hidden change failed', () => {
    beforeEach(async () => {
      coordinator.show();
      runAt(deferred, 0).settle(LOADED_MODEL_STUB);
      await flushSettles();
      coordinator.request('watch');
      coordinator.show();
      runAt(deferred, 1).settle(RUN_FAILED);
      await flushSettles();
    });

    it('WHEN shown three more times THEN no load starts', () => {
      coordinator.show();
      coordinator.show();
      coordinator.show();

      expect(deferred.runs).toHaveLength(2);
    });

    it('WHEN ensured THEN it returns with no new load', async () => {
      await coordinator.ensureLoaded();

      expect(deferred.runs).toHaveLength(2);
    });

    it('WHEN a new hidden change comes in and it is shown twice THEN exactly one full load starts', () => {
      coordinator.request('watch');
      coordinator.show();
      coordinator.show();

      expect(deferred.runs.map((run) => run.mode)).toStrictEqual(['cache-first', 'full', 'full']);
    });

    it('WHEN a refresh comes in THEN one full load starts', () => {
      coordinator.request('refresh');

      expect(deferred.runs.map((run) => run.mode)).toStrictEqual(['cache-first', 'full', 'full']);
    });
  });

  describe('GIVEN a loaded root whose reload after a hidden change failed to find the binary', () => {
    beforeEach(async () => {
      coordinator.show();
      runAt(deferred, 0).settle(LOADED_MODEL_STUB);
      await flushSettles();
      coordinator.request('watch');
      coordinator.show();
      runAt(deferred, 1).settle(LOAD_FAILURE_STUB);
      await flushSettles();
    });

    it('WHEN shown again THEN no load starts', () => {
      coordinator.show();

      expect(deferred.runs).toHaveLength(2);
    });

    it('WHEN ensured twice in a row THEN each call runs one full load', async () => {
      const first = coordinator.ensureLoaded();

      runAt(deferred, 2).settle(LOAD_FAILURE_STUB);
      await first;

      const second = coordinator.ensureLoaded();

      runAt(deferred, 3).settle(LOAD_FAILURE_STUB);
      await second;

      expect(deferred.runs.map((run) => run.mode)).toStrictEqual(['cache-first', 'full', 'full', 'full']);
    });
  });

  it('GIVEN a loaded root and a hidden view WHEN a setting request comes in THEN it is stale and no load starts', async () => {
    coordinator.show();
    runAt(deferred, 0).settle(LOADED_MODEL_STUB);
    await flushSettles();
    coordinator.request('setting');

    expect(coordinator.isStale()).toBe(true);
    expect(deferred.runs).toHaveLength(1);
  });
});
