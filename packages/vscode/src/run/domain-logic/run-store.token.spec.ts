import type { RunMatch } from '@turbo-console/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RunStore } from './run-store.ts';
import type { RunDefinition, Terminable } from '../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';

const RUN: RunDefinition = { root: '/ws', id: 'build' };
const FIRST_MATCH: RunMatch = { cache: 'HIT', durationMs: 9999, interrupted: false };
const SECOND_MATCH: RunMatch = { cache: 'MISS', durationMs: 1200, interrupted: false };

const terminable = (): Terminable => {
  const execution: Terminable = { terminate: vi.fn() };

  return execution;
};

describe('FEATURE: run store, calls of one run never reach another run of the task', () => {
  let store: RunStore;

  beforeEach(() => {
    store = new RunStore();
    store.tryStart(RUN_REQUEST_STUB, 1000);
  });

  describe('GIVEN run 1 ended waiting for its match, then run 2 started and ended waiting for its own', () => {
    beforeEach(() => {
      store.processEnded(RUN, 0, 4000);
      store.tryStart(RUN_REQUEST_STUB, 5000);
      store.processEnded(RUN, 1, 6000);
    });

    it('WHEN run 1 match arrives late THEN run 2 does not get it', () => {
      store.setMatch(RUN, 1000, FIRST_MATCH);

      expect(store.get('/ws', 'build')).toMatchObject({ launchedAt: 5000, match: null, matching: true });
    });

    it('WHEN run 1 match arrives late and then run 2 match THEN run 2 holds its own match', () => {
      store.setMatch(RUN, 1000, FIRST_MATCH);
      store.setMatch(RUN, 5000, SECOND_MATCH);

      expect(store.get('/ws', 'build')).toMatchObject({ launchedAt: 5000, match: SECOND_MATCH, matching: false });
    });
  });

  describe('GIVEN run 1 failed to start, then run 2 started', () => {
    let first: Terminable;
    let second: Terminable;

    beforeEach(() => {
      first = terminable();
      second = terminable();
      store.failStart(RUN, 1500);
      store.tryStart(RUN_REQUEST_STUB, 5000);
    });

    it('WHEN run 1 execution arrives late THEN it is not terminated, as that would stop the task of run 2', () => {
      store.attach(RUN, 1000, first);

      expect(first.terminate).not.toHaveBeenCalled();
    });

    it('WHEN run 1 execution arrives after run 2 own THEN Stop terminates run 2 execution', () => {
      store.attach(RUN, 5000, second);
      store.attach(RUN, 1000, first);

      store.requestStop(RUN);

      expect(second.terminate).toHaveBeenCalledOnce();
    });

    it('WHEN run 1 failed start is reported again THEN run 2 keeps running', () => {
      store.failStart(RUN, 5500, 1000);

      expect(store.get('/ws', 'build')).toMatchObject({ launchedAt: 5000, state: 'running' });
    });

    it('WHEN its own failed start is reported THEN run 2 ends', () => {
      store.failStart(RUN, 5500, 5000);

      expect(store.get('/ws', 'build')?.state).toBe('failed-to-start');
    });

    it('WHEN a task end with no run token is reported THEN the running run 2 ends', () => {
      store.failStart(RUN, 5500);

      expect(store.get('/ws', 'build')).toMatchObject({ launchedAt: 5000, state: 'failed-to-start' });
    });
  });

  describe('GIVEN run 1 ended, then run 2 started at 5000', () => {
    beforeEach(() => {
      store.processEnded(RUN, 0, 4000, 1000);
      store.tryStart(RUN_REQUEST_STUB, 5000);
    });

    it('WHEN run 1 process start is reported late with its token THEN run 2 records no process start', () => {
      store.processStarted(RUN, 5100, 1000);

      expect(store.get('/ws', 'build')?.processStartedAt).toBeNull();
    });

    it('WHEN run 1 process end is reported late with its token THEN run 2 keeps running', () => {
      store.processEnded(RUN, 0, 5200, 1000);

      expect(store.get('/ws', 'build')).toMatchObject({ launchedAt: 5000, state: 'running' });
    });

    it('WHEN its own process start is reported with its token THEN run 2 records it', () => {
      store.processStarted(RUN, 5100, 5000);

      expect(store.get('/ws', 'build')?.processStartedAt).toBe(5100);
    });

    it('WHEN its own process end is reported with its token THEN run 2 ends', () => {
      store.processEnded(RUN, 0, 5200, 5000);

      expect(store.get('/ws', 'build')?.state).toBe('passed');
    });
  });

  describe('GIVEN run 1 ended before its execution was handed over', () => {
    it('WHEN its execution arrives THEN it is terminated', () => {
      const execution = terminable();

      store.processEnded(RUN, 0, 4000);
      store.attach(RUN, 1000, execution);

      expect(execution.terminate).toHaveBeenCalledOnce();
    });
  });
});
