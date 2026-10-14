import { TurboException } from '@turbo-console/core';
import type { RunMatch } from '@turbo-console/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { finishRun, runTask } from './run-flow.ts';
import { RunStore } from './run-store.ts';
import type { RunDefinition, RunEntry, RunPorts, Terminable } from '../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';
import { fakeRunPorts } from '../test/utils/fake-run-ports.spec.util.ts';

const RUN: RunDefinition = { root: '/ws', id: 'build' };
const MATCH: RunMatch = { cache: 'MISS', durationMs: 2500 };

const endedEntry = (store: RunStore, exitCode: number | undefined): RunEntry => {
  const ended = store.processEnded(RUN, exitCode, 4000);

  if (ended === null) throw new Error('the run was not running');

  return ended;
};

describe('FEATURE: run flow, matching a run summary', () => {
  let store: RunStore;
  let execution: Terminable;
  let ports: RunPorts;

  beforeEach(() => {
    vi.useFakeTimers();
    store = new RunStore();
    execution = { terminate: vi.fn() };
    ports = fakeRunPorts(execution);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GIVEN a run whose process ended with exit code 0', () => {
    let entry: RunEntry;

    beforeEach(async () => {
      await runTask(store, ports, RUN_REQUEST_STUB);
      entry = endedEntry(store, 0);
    });

    describe('WHEN its summary lookup has not settled yet', () => {
      let slow: RunPorts;

      beforeEach(() => {
        const lookup = Promise.withResolvers<RunMatch | null>();
        const match = vi.fn().mockReturnValue(lookup.promise);

        slow = fakeRunPorts(execution, { match });
        void finishRun(store, slow, entry);
      });

      it('THEN its summary is being looked up', () => {
        expect(slow.match).toHaveBeenCalledOnce();
      });

      it('THEN the entry is still matching', () => {
        expect(store.get(RUN.root, RUN.id)?.matching).toBe(true);
      });
    });

    it('WHEN its summary matches THEN the summary of exactly that run is asked for', async () => {
      await finishRun(store, ports, entry);

      expect(ports.match).toHaveBeenCalledExactlyOnceWith('/ws', {
        task: entry.task,
        packageName: 'a',
        launchedAt: 1000,
        endedAt: 4000,
        exitCode: 0
      });
    });

    it('WHEN its summary matches THEN the entry holds the match and matching ends', async () => {
      const match = vi.fn().mockResolvedValue(MATCH);
      const matched = fakeRunPorts(execution, { match });

      await finishRun(store, matched, entry);

      expect(store.get(RUN.root, RUN.id)).toMatchObject({ state: 'passed', match: MATCH, matching: false });
    });

    describe('WHEN the summary lookup rejects', () => {
      let failing: RunPorts;

      beforeEach(async () => {
        const error = new TurboException('io', 'cannot list .turbo/runs');
        const match = vi.fn().mockRejectedValue(error);

        failing = fakeRunPorts(execution, { match });
        await finishRun(store, failing, entry);
      });

      it('THEN the entry keeps its exit code with no match and matching ends', () => {
        expect(store.get(RUN.root, RUN.id)).toMatchObject({ exitCode: 0, match: null, matching: false });
      });

      it('THEN the error is logged', () => {
        expect(failing.log).toHaveBeenCalledExactlyOnceWith('turbo io: cannot list .turbo/runs');
      });
    });
  });

  describe('GIVEN run 1 ended, then run 2 started and ended before run 1 match arrived', () => {
    it('WHEN run 1 match arrives THEN run 2 does not get it', async () => {
      const match = vi.fn().mockResolvedValue(MATCH);
      const later = fakeRunPorts(execution, { match, now: () => 5000 });

      await runTask(store, ports, RUN_REQUEST_STUB);
      const first = endedEntry(store, 0);

      await runTask(store, later, RUN_REQUEST_STUB);
      store.processEnded(RUN, 1, 6000);

      await finishRun(store, later, first);

      expect(store.get('/ws', 'build')).toMatchObject({ launchedAt: 5000, match: null, matching: true });
    });
  });

  describe('GIVEN a run whose process ended with no exit code', () => {
    it('WHEN it is finished THEN no summary is asked for', async () => {
      await runTask(store, ports, RUN_REQUEST_STUB);
      const entry = endedEntry(store, undefined);

      await finishRun(store, ports, entry);

      expect(ports.match).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a run the user stopped', () => {
    let entry: RunEntry;

    beforeEach(async () => {
      await runTask(store, ports, RUN_REQUEST_STUB);
      store.requestStop(RUN);
      entry = endedEntry(store, 1);
    });

    it('WHEN its process ends THEN it never waits for a match', () => {
      expect(entry.matching).toBe(false);
    });

    it('WHEN it is finished THEN no summary is asked for', async () => {
      await finishRun(store, ports, entry);

      expect(ports.match).not.toHaveBeenCalled();
    });
  });
});
