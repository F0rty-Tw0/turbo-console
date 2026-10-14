import { TurboException } from '@turbo-console/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { LoadCoordinator } from './load-coordinator.ts';
import type { LoadFailure, LoadResult, LoadedModel } from '../common/root.type.ts';
import type { DeferredPorts } from '../test/common/coordinator.type.ts';
import { LOADED_MODEL_STUB, LOAD_FAILURE_STUB } from '../test/stubs/root.stub.ts';
import { deferredPorts, flushSettles, runAt, settledFlag } from '../test/utils/deferred-ports.spec.util.ts';

const STALE_CACHED: LoadedModel = { ...LOADED_MODEL_STUB, fromCache: true, isFresh: false };
const LOAD_ERROR = new TurboException('failed', 'turbo exited 1');
const LOAD_FAILED: LoadFailure = { kind: 'error', stage: 'load', error: LOAD_ERROR };
const ABORT_ERROR = new TurboException('failed', 'This operation was aborted');
const ABORTED: LoadFailure = { kind: 'error', stage: 'load', error: ABORT_ERROR };

describe('FEATURE: ensure a root is loaded', () => {
  let deferred: DeferredPorts;
  let coordinator: LoadCoordinator;

  const loadWith = async (result: LoadResult): Promise<void> => {
    coordinator.show();
    runAt(deferred, deferred.runs.length - 1).settle(result);
    await flushSettles();
  };

  beforeEach(() => {
    deferred = deferredPorts();
    coordinator = new LoadCoordinator(deferred.ports);
  });

  it('GIVEN a never-loaded root WHEN ensured THEN one cache-first load runs', () => {
    void coordinator.ensureLoaded();

    expect(deferred.runs.map((run) => run.mode)).toStrictEqual(['cache-first']);
  });

  describe('GIVEN a root with a fresh model', () => {
    beforeEach(async () => {
      await loadWith(LOADED_MODEL_STUB);
    });

    it('WHEN ensured THEN it returns with no new load', async () => {
      await coordinator.ensureLoaded();

      expect(deferred.runs).toHaveLength(1);
    });

    it('WHEN marked stale while hidden and ensured THEN one full load runs', () => {
      coordinator.request('watch');
      void coordinator.ensureLoaded();

      expect(deferred.runs.map((run) => run.mode)).toStrictEqual(['cache-first', 'full']);
    });
  });

  describe('GIVEN a load in flight', () => {
    beforeEach(() => {
      coordinator.show();
    });

    it('WHEN ensured THEN it joins that load without aborting it', () => {
      void coordinator.ensureLoaded();

      expect(deferred.runs).toHaveLength(1);
      expect(runAt(deferred, 0).signal.aborted).toBe(false);
    });

    it('WHEN ensured THEN it resolves only once that load settles', async () => {
      const isEnsured = settledFlag(coordinator.ensureLoaded());

      await flushSettles();

      const wasEnsuredEarly = isEnsured();

      runAt(deferred, 0).settle(LOADED_MODEL_STUB);
      await flushSettles();

      expect(wasEnsuredEarly).toBe(false);
      expect(isEnsured()).toBe(true);
    });

    it('WHEN the joined load ends in an error THEN no load of its own starts', async () => {
      const ensured = coordinator.ensureLoaded();

      runAt(deferred, 0).settle(LOAD_FAILURE_STUB);
      await ensured;

      expect(deferred.runs).toHaveLength(1);
    });

    it('WHEN the joined load is superseded by a hidden request THEN one full load of its own runs', async () => {
      const ensured = coordinator.ensureLoaded();

      coordinator.request('watch');
      runAt(deferred, 0).settle(ABORTED);
      await flushSettles();
      runAt(deferred, 1).settle(LOADED_MODEL_STUB);
      await ensured;

      expect(deferred.runs.map((run) => run.mode)).toStrictEqual(['cache-first', 'full']);
    });

    it('WHEN the joined load is superseded by a visible request THEN it joins the newer load', async () => {
      const ensured = coordinator.ensureLoaded();

      deferred.setVisible(true);
      coordinator.request('watch');
      runAt(deferred, 0).settle(ABORTED);
      runAt(deferred, 1).settle(LOADED_MODEL_STUB);
      await ensured;

      expect(deferred.runs).toHaveLength(2);
    });

    it('WHEN the coordinator is disposed during the join THEN it returns with no new load', async () => {
      const ensured = coordinator.ensureLoaded();

      coordinator.dispose();
      runAt(deferred, 0).settle(ABORTED);
      await ensured;

      expect(deferred.runs).toHaveLength(1);
    });
  });

  describe('GIVEN a root marked stale while hidden', () => {
    beforeEach(async () => {
      await loadWith(LOADED_MODEL_STUB);
      coordinator.request('watch');
    });

    it('WHEN ensured and shown during that full load THEN exactly one load runs', async () => {
      const ensured = coordinator.ensureLoaded();

      coordinator.show();
      runAt(deferred, 1).settle(LOADED_MODEL_STUB);
      await ensured;
      await flushSettles();

      expect(deferred.runs).toHaveLength(2);
      expect(coordinator.isStale()).toBe(false);
    });

    it('WHEN its own load is superseded by another hidden request THEN it starts no second load', async () => {
      const ensured = coordinator.ensureLoaded();

      coordinator.request('watch');
      runAt(deferred, 1).settle(ABORTED);
      await ensured;

      expect(deferred.runs).toHaveLength(2);
    });
  });

  describe('GIVEN a root whose last load ended in a binary error', () => {
    beforeEach(async () => {
      await loadWith(LOAD_FAILURE_STUB);
    });

    it('WHEN ensured twice in a row THEN each call runs one full load', async () => {
      const first = coordinator.ensureLoaded();

      runAt(deferred, 1).settle(LOAD_FAILURE_STUB);
      await first;

      const second = coordinator.ensureLoaded();

      runAt(deferred, 2).settle(LOAD_FAILURE_STUB);
      await second;

      expect(deferred.runs.map((run) => run.mode)).toStrictEqual(['cache-first', 'full', 'full']);
    });
  });

  describe('GIVEN a root whose last load failed with no model', () => {
    beforeEach(async () => {
      await loadWith(LOAD_FAILED);
    });

    it('WHEN ensured THEN one full load runs', () => {
      void coordinator.ensureLoaded();

      expect(deferred.runs.map((run) => run.mode)).toStrictEqual(['cache-first', 'full']);
    });
  });

  describe('GIVEN a root showing a stale cached model whose full load failed', () => {
    beforeEach(async () => {
      coordinator.show();
      runAt(deferred, 0).publish(STALE_CACHED);
      runAt(deferred, 0).settle(LOAD_FAILED);
      await flushSettles();
    });

    it('WHEN ensured THEN it returns with no new load', async () => {
      await coordinator.ensureLoaded();

      expect(deferred.runs).toHaveLength(1);
    });
  });
});
