import { TurboException } from '@turbo-console/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoadCoordinator } from './load-coordinator.ts';
import type { LoadFailure, LoadedModel } from '../common/root.type.ts';
import type { DeferredPorts } from '../test/common/coordinator.type.ts';
import { LOADED_MODEL_STUB, LOAD_FAILURE_STUB } from '../test/stubs/root.stub.ts';
import { deferredPorts, flushSettles, runAt, settledFlag } from '../test/utils/deferred-ports.spec.util.ts';

const STALE_CACHED: LoadedModel = { ...LOADED_MODEL_STUB, fromCache: true, isFresh: false };
const FRESH_CACHED: LoadedModel = { ...LOADED_MODEL_STUB, fromCache: true };
const ABORT_ERROR = new TurboException('failed', 'This operation was aborted');
const ABORTED: LoadFailure = { kind: 'error', stage: 'load', error: ABORT_ERROR };

describe('FEATURE: load coordinator', () => {
  let deferred: DeferredPorts;
  let coordinator: LoadCoordinator;

  beforeEach(() => {
    deferred = deferredPorts();
    coordinator = new LoadCoordinator(deferred.ports);
  });

  describe('GIVEN a never-loaded root whose cache-first load is in flight', () => {
    beforeEach(() => {
      coordinator.show();
    });

    it('WHEN a change request comes in THEN that load is aborted', () => {
      coordinator.request('watch');

      expect(runAt(deferred, 0).signal.aborted).toBe(true);
    });

    it('WHEN a change request comes in and the load still returns a model THEN nothing is applied', async () => {
      coordinator.request('watch');
      runAt(deferred, 0).settle(LOADED_MODEL_STUB);
      await flushSettles();

      expect(deferred.ports.apply).not.toHaveBeenCalled();
    });

    it('WHEN a change request comes in and the load then publishes THEN the publish is not applied', () => {
      coordinator.request('watch');
      runAt(deferred, 0).publish(STALE_CACHED);

      expect(deferred.ports.apply).not.toHaveBeenCalled();
    });

    it('WHEN a hidden change request aborts the load and it still returns a model THEN the root stays stale', async () => {
      coordinator.request('watch');
      runAt(deferred, 0).settle(LOADED_MODEL_STUB);
      await flushSettles();

      expect(coordinator.isStale()).toBe(true);
    });

    it('WHEN disposed THEN that load is aborted', () => {
      coordinator.dispose();

      expect(runAt(deferred, 0).signal.aborted).toBe(true);
    });

    it('WHEN show comes in again THEN no second load starts', () => {
      coordinator.show();

      expect(deferred.runs.map((run) => run.mode)).toStrictEqual(['cache-first']);
    });

    describe('WHEN a hidden change request comes in and show follows before the load settles', () => {
      beforeEach(() => {
        coordinator.request('watch');
        coordinator.show();
      });

      it('THEN nothing new starts while the aborted load is still settling', () => {
        expect(deferred.runs).toHaveLength(1);
      });

      it('THEN exactly one full load starts once the aborted load settles', async () => {
        runAt(deferred, 0).settle(ABORTED);
        await flushSettles();

        expect(deferred.runs.map((run) => run.mode)).toStrictEqual(['cache-first', 'full']);
      });
    });

    describe('WHEN a visible change request starts a newer load', () => {
      beforeEach(() => {
        deferred.setVisible(true);
        coordinator.request('watch');
      });

      it('THEN the older load late model is dropped', async () => {
        runAt(deferred, 0).settle(STALE_CACHED);
        await flushSettles();

        expect(deferred.ports.apply).not.toHaveBeenCalled();
      });

      it('THEN only the newer load model is applied', async () => {
        runAt(deferred, 1).settle(LOADED_MODEL_STUB);
        runAt(deferred, 0).settle(STALE_CACHED);
        await flushSettles();

        expect(deferred.ports.apply).toHaveBeenCalledExactlyOnceWith(LOADED_MODEL_STUB);
      });
    });
  });

  describe('GIVEN a loaded root and a hidden view', () => {
    beforeEach(async () => {
      coordinator.show();
      runAt(deferred, 0).settle(LOADED_MODEL_STUB);
      await flushSettles();
    });

    it('WHEN a watch request comes in THEN the root is stale and no load starts', () => {
      coordinator.request('watch');

      expect(coordinator.isStale()).toBe(true);
      expect(deferred.runs).toHaveLength(1);
    });

    it('WHEN a watch request comes in and show follows THEN exactly one full load starts', () => {
      coordinator.request('watch');
      coordinator.show();
      coordinator.show();

      expect(deferred.runs.map((run) => run.mode)).toStrictEqual(['cache-first', 'full']);
    });

    it('WHEN a refresh request comes in THEN a full load starts at once', () => {
      coordinator.request('refresh');

      expect(deferred.runs.map((run) => run.mode)).toStrictEqual(['cache-first', 'full']);
    });

    it('WHEN show comes in and the root is not stale THEN no load starts', () => {
      coordinator.show();

      expect(deferred.runs).toHaveLength(1);
    });

    it('WHEN a stale root reloads with a model THEN it is no longer stale', async () => {
      coordinator.request('refresh');
      runAt(deferred, 1).settle(LOADED_MODEL_STUB);
      await flushSettles();

      expect(coordinator.isStale()).toBe(false);
    });
  });

  it('GIVEN a show that came in during an earlier load WHEN a later hidden load is aborted THEN no follow-up starts', async () => {
    coordinator.show();
    coordinator.show();
    runAt(deferred, 0).settle(LOADED_MODEL_STUB);
    await flushSettles();
    coordinator.request('refresh');
    coordinator.request('watch');
    runAt(deferred, 1).settle(ABORTED);
    await flushSettles();

    expect(deferred.runs).toHaveLength(2);
  });

  describe('GIVEN a root whose binary failed and whose retry load is in flight', () => {
    beforeEach(async () => {
      coordinator.show();
      runAt(deferred, 0).settle(LOAD_FAILURE_STUB);
      await flushSettles();
      void coordinator.ensureLoaded();
    });

    it('WHEN a hidden watch request aborts it THEN nothing more is applied', async () => {
      coordinator.request('watch');
      runAt(deferred, 1).settle(ABORTED);
      await flushSettles();

      expect(deferred.ports.apply).toHaveBeenCalledExactlyOnceWith(LOAD_FAILURE_STUB);
    });
  });

  describe('GIVEN a visible view', () => {
    beforeEach(() => {
      deferred.setVisible(true);
    });

    it('WHEN a watch request comes in THEN a full load starts at once', () => {
      coordinator.request('watch');

      expect(deferred.runs.map((run) => run.mode)).toStrictEqual(['full']);
    });

    it('WHEN the full load after a request fails THEN no follow-up load starts and the root stays stale', async () => {
      coordinator.request('watch');
      runAt(deferred, 0).settle(LOAD_FAILURE_STUB);
      await flushSettles();

      expect(deferred.runs).toHaveLength(1);
      expect(coordinator.isStale()).toBe(true);
    });

    it('WHEN a stale cache is published and the full model returns THEN both are applied in order', async () => {
      coordinator.show();
      runAt(deferred, 0).publish(STALE_CACHED);
      runAt(deferred, 0).settle(LOADED_MODEL_STUB);
      await flushSettles();

      expect(deferred.ports.apply).toHaveBeenNthCalledWith(1, STALE_CACHED);
      expect(deferred.ports.apply).toHaveBeenNthCalledWith(2, LOADED_MODEL_STUB);
    });

    it('WHEN a fresh cache is published and returned as the same object THEN it is applied once', async () => {
      coordinator.show();
      runAt(deferred, 0).publish(FRESH_CACHED);
      runAt(deferred, 0).settle(FRESH_CACHED);
      await flushSettles();

      expect(deferred.ports.apply).toHaveBeenCalledExactlyOnceWith(FRESH_CACHED);
    });
  });

  describe('GIVEN a cache-first load that starts', () => {
    beforeEach(() => {
      coordinator.show();
    });

    it('WHEN it starts THEN one record is made with no outcome yet', () => {
      expect(deferred.ports.record).toHaveBeenCalledExactlyOnceWith({
        mode: 'cache-first',
        startedAt: 1_000,
        outcome: null,
        cacheFresh: null
      });
    });

    it('WHEN a fresh cache answers THEN that same record reads a model from a fresh cache', async () => {
      const record = vi.mocked(deferred.ports.record).mock.calls[0]?.[0];

      runAt(deferred, 0).publish(FRESH_CACHED);
      runAt(deferred, 0).settle(FRESH_CACHED);
      await flushSettles();

      expect(record).toStrictEqual({ mode: 'cache-first', startedAt: 1_000, outcome: 'model', cacheFresh: true });
    });

    it('WHEN no cache answers and the load fails THEN the record reads an error with no fresh cache', async () => {
      const record = vi.mocked(deferred.ports.record).mock.calls[0]?.[0];

      runAt(deferred, 0).settle(LOAD_FAILURE_STUB);
      await flushSettles();

      expect(record).toMatchObject({ outcome: 'error', cacheFresh: false });
    });

    it('WHEN it is aborted THEN the record reads aborted', async () => {
      const record = vi.mocked(deferred.ports.record).mock.calls[0]?.[0];

      coordinator.request('watch');
      runAt(deferred, 0).settle(LOADED_MODEL_STUB);
      await flushSettles();

      expect(record?.outcome).toBe('aborted');
    });
  });

  it('GIVEN a full load WHEN it settles with a model THEN its record has no cache freshness', async () => {
    coordinator.request('refresh');

    const record = vi.mocked(deferred.ports.record).mock.calls[0]?.[0];

    runAt(deferred, 0).settle(LOADED_MODEL_STUB);
    await flushSettles();

    expect(record).toMatchObject({ mode: 'full', outcome: 'model', cacheFresh: null });
  });

  describe('GIVEN a never-loaded root and first children are asked for', () => {
    let isAnswered: () => boolean;

    beforeEach(() => {
      isAnswered = settledFlag(coordinator.firstChildren());
    });

    it('WHEN asked THEN one cache-first load starts', () => {
      expect(deferred.runs.map((run) => run.mode)).toStrictEqual(['cache-first']);
    });

    it('WHEN asked again THEN it joins the load in flight', () => {
      void coordinator.firstChildren();

      expect(deferred.runs).toHaveLength(1);
    });

    it('WHEN the cache is published and the full load is still pending THEN it resolves', async () => {
      runAt(deferred, 0).publish(STALE_CACHED);
      await flushSettles();

      expect(isAnswered()).toBe(true);
    });

    it('WHEN nothing is published yet THEN it has not resolved', async () => {
      await flushSettles();

      expect(isAnswered()).toBe(false);
    });

    it('WHEN the load settles with an error THEN it resolves', async () => {
      runAt(deferred, 0).settle(LOAD_FAILURE_STUB);
      await flushSettles();

      expect(isAnswered()).toBe(true);
    });
  });

  describe('GIVEN a loaded root', () => {
    beforeEach(async () => {
      coordinator.show();
      runAt(deferred, 0).settle(LOADED_MODEL_STUB);
      await flushSettles();
    });

    it('WHEN first children are asked for THEN it resolves with no new load', async () => {
      await coordinator.firstChildren();

      expect(deferred.runs).toHaveLength(1);
    });

    it('WHEN marked stale and first children are asked for THEN one full load starts and it resolves at once', async () => {
      coordinator.request('watch');
      await coordinator.firstChildren();

      expect(deferred.runs.map((run) => run.mode)).toStrictEqual(['cache-first', 'full']);
    });

    it('WHEN nothing is in flight THEN whenSettled resolves', async () => {
      await coordinator.whenSettled();

      expect(deferred.runs).toHaveLength(1);
    });
  });

  it('GIVEN a load whose settle starts a follow-up load WHEN waiting for settled THEN it waits for the follow-up too', async () => {
    coordinator.show();
    coordinator.request('watch');
    coordinator.show();

    const isSettled = settledFlag(coordinator.whenSettled());

    runAt(deferred, 0).settle(ABORTED);
    await flushSettles();

    const wasSettledEarly = isSettled();

    runAt(deferred, 1).settle(LOADED_MODEL_STUB);
    await flushSettles();

    expect(wasSettledEarly).toBe(false);
    expect(isSettled()).toBe(true);
  });

  describe('GIVEN a stale root disposed while its load is in flight and the view then shown', () => {
    beforeEach(() => {
      coordinator.show();
      coordinator.request('watch');
      coordinator.dispose();
      deferred.setVisible(true);
    });

    it('WHEN a refresh request comes in THEN no load starts', () => {
      coordinator.request('refresh');

      expect(deferred.runs).toHaveLength(1);
    });

    it('WHEN the aborted load settles THEN no follow-up load starts', async () => {
      runAt(deferred, 0).settle(ABORTED);
      await flushSettles();

      expect(deferred.runs).toHaveLength(1);
    });
  });
});
