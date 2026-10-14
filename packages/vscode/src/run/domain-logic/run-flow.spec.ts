import { TurboException } from '@turbo-console/core';
import type { RunMatch } from '@turbo-console/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { failStart, finishRun, runTask } from './run-flow.ts';
import { RunStore } from './run-store.ts';
import { START_TIMEOUT_MS } from '../common/run.const.ts';
import type { RunDefinition, RunEntry, RunPorts, RunRequest, Terminable } from '../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';
import { fakeRunPorts } from '../test/utils/fake-run-ports.spec.util.ts';

const RUN: RunDefinition = { root: '/ws', id: 'build' };
const FILTER_PACKAGE: RunRequest = { ...RUN_REQUEST_STUB, packageName: '@x/a*' };
const MATCH: RunMatch = { cache: 'MISS', durationMs: 2500 };

const NOT_EXECUTABLE: Partial<RunPorts> = { canExecute: async () => Promise.resolve(false) };
const CHECK_THROWS: Partial<RunPorts> = { canExecute: async () => Promise.reject(new Error('EACCES')) };
const LAUNCH_REJECTS: Partial<RunPorts> = { execute: async () => Promise.reject(new Error('no task')) };

const stateOf = (store: RunStore): string | undefined => store.get(RUN.root, RUN.id)?.state;

const endedEntry = (store: RunStore, exitCode: number | undefined): RunEntry => {
  const ended = store.processEnded(RUN, exitCode, 4000);

  if (ended === null) throw new Error('the run was not running');

  return ended;
};

describe('FEATURE: run flow', () => {
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

  describe('GIVEN a task with no run', () => {
    it('WHEN it is run THEN turbo runs that task of that package with a summary', async () => {
      const args = ['--skip-infer', 'run', 'build', '--filter=a', '--summarize'];

      await runTask(store, ports, RUN_REQUEST_STUB);

      expect(ports.execute).toHaveBeenCalledExactlyOnceWith(RUN_REQUEST_STUB, args);
    });

    it('WHEN it is run twice without waiting THEN the second run is refused at once', () => {
      void runTask(store, ports, RUN_REQUEST_STUB);
      void runTask(store, ports, RUN_REQUEST_STUB);

      expect(ports.info).toHaveBeenCalledExactlyOnceWith('Already running.');
    });

    it('WHEN it is run twice without waiting THEN turbo is launched once', async () => {
      const first = runTask(store, ports, RUN_REQUEST_STUB);
      const second = runTask(store, ports, RUN_REQUEST_STUB);

      await Promise.all([first, second]);

      expect(ports.execute).toHaveBeenCalledOnce();
    });

    it('WHEN Stop is pressed after the run launched THEN its execution is terminated', async () => {
      await runTask(store, ports, RUN_REQUEST_STUB);

      store.requestStop(RUN);

      expect(execution.terminate).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN a launch that has not resolved yet', () => {
    it('WHEN Stop is pressed THEN the execution is terminated on arrival', async () => {
      const launch = Promise.withResolvers<Terminable>();
      const execute = vi.fn().mockReturnValue(launch.promise);
      const pending = fakeRunPorts(execution, { execute });
      const running = runTask(store, pending, RUN_REQUEST_STUB);

      await vi.waitFor(() => expect(pending.execute).toHaveBeenCalled());

      store.requestStop(RUN);
      launch.resolve(execution);
      await running;

      expect(execution.terminate).toHaveBeenCalledOnce();
    });
  });

  describe.each<[string, RunRequest, Partial<RunPorts>]>([
    ['a binary that cannot be run', RUN_REQUEST_STUB, NOT_EXECUTABLE],
    ['a binary check that throws', RUN_REQUEST_STUB, CHECK_THROWS],
    ['a package name holding filter syntax', FILTER_PACKAGE, {}],
    ['a launch that rejects', RUN_REQUEST_STUB, LAUNCH_REJECTS]
  ])('GIVEN %s', (_name, request, overrides) => {
    let failing: RunPorts;

    beforeEach(async () => {
      failing = fakeRunPorts(execution, overrides);
      await runTask(store, failing, request);
    });

    it('WHEN it is run THEN the entry ends as failed to start', () => {
      expect(stateOf(store)).toBe('failed-to-start');
    });

    it('WHEN it is run THEN the user is told turbo could not start', () => {
      expect(failing.notifyFailedToStart).toHaveBeenCalledOnce();
    });

    it('WHEN it is run THEN the reason is logged', () => {
      expect(failing.log).toHaveBeenCalledOnce();
    });

    it('WHEN it is run THEN the start watchdog is not set', () => {
      expect(failing.after).not.toHaveBeenCalled();
    });
  });

  describe.each<[string, RunRequest, Partial<RunPorts>]>([
    ['a binary that cannot be run', RUN_REQUEST_STUB, NOT_EXECUTABLE],
    ['a binary check that throws', RUN_REQUEST_STUB, CHECK_THROWS],
    ['a package name holding filter syntax', FILTER_PACKAGE, {}]
  ])('GIVEN %s, before launching', (_name, request, overrides) => {
    it('WHEN it is run THEN turbo is never launched', async () => {
      const failing = fakeRunPorts(execution, overrides);

      await runTask(store, failing, request);

      expect(failing.execute).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a package name holding filter syntax', () => {
    it('WHEN it is run THEN the turbo error is logged', async () => {
      await runTask(store, ports, FILTER_PACKAGE);

      expect(ports.log).toHaveBeenCalledWith(expect.stringMatching(/^turbo /));
    });
  });

  describe('GIVEN a launched run', () => {
    beforeEach(async () => {
      await runTask(store, ports, RUN_REQUEST_STUB);
    });

    describe('WHEN its process never starts before the start timeout', () => {
      beforeEach(() => {
        vi.advanceTimersByTime(START_TIMEOUT_MS);
      });

      it('THEN its execution is terminated', () => {
        expect(execution.terminate).toHaveBeenCalledOnce();
      });

      it('THEN the entry ends as failed to start', () => {
        expect(stateOf(store)).toBe('failed-to-start');
      });

      it('THEN the user is told turbo could not start', () => {
        expect(ports.notifyFailedToStart).toHaveBeenCalledOnce();
      });
    });

    it('WHEN its process starts before the start timeout THEN the timeout does nothing', () => {
      store.processStarted(RUN, 1200);

      vi.advanceTimersByTime(START_TIMEOUT_MS);

      expect(stateOf(store)).toBe('running');
    });

    it('WHEN the start timeout has not passed THEN the run keeps running', () => {
      vi.advanceTimersByTime(START_TIMEOUT_MS - 1);

      expect(stateOf(store)).toBe('running');
    });

    it('WHEN it ended and a new run started before the first timeout THEN that timeout leaves the new run alone', async () => {
      const later = fakeRunPorts(execution, { now: () => 6000 });

      failStart(store, ports, RUN);
      vi.advanceTimersByTime(5000);
      await runTask(store, later, RUN_REQUEST_STUB);
      vi.advanceTimersByTime(START_TIMEOUT_MS - 5000);

      expect(stateOf(store)).toBe('running');
    });

    it('WHEN its task ends with no process end THEN the entry ends as failed to start', () => {
      failStart(store, ports, RUN);

      expect(stateOf(store)).toBe('failed-to-start');
    });

    it('WHEN its task ends with no process end THEN the user is told turbo could not start', () => {
      failStart(store, ports, RUN);

      expect(ports.notifyFailedToStart).toHaveBeenCalledOnce();
    });

    it('WHEN its task ends after its process ended THEN the user is not told anything', () => {
      store.processEnded(RUN, 0, 4000);

      failStart(store, ports, RUN);

      expect(ports.notifyFailedToStart).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a run whose process ended with exit code 0', () => {
    let entry: RunEntry;

    beforeEach(async () => {
      await runTask(store, ports, RUN_REQUEST_STUB);
      entry = endedEntry(store, 0);
    });

    it('WHEN its summary is still being matched THEN the entry is matching', () => {
      const lookup = Promise.withResolvers<RunMatch | null>();
      const match = vi.fn().mockReturnValue(lookup.promise);
      const slow = fakeRunPorts(execution, { match });

      void finishRun(store, slow, entry);

      expect(store.get(RUN.root, RUN.id)?.matching).toBe(true);
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

  describe('GIVEN a run whose process ended with no exit code', () => {
    it('WHEN it is finished THEN no summary is asked for', async () => {
      await runTask(store, ports, RUN_REQUEST_STUB);
      const entry = endedEntry(store, undefined);

      await finishRun(store, ports, entry);

      expect(ports.match).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a run the user stopped', () => {
    it('WHEN its process ends THEN it never waits for a match', async () => {
      await runTask(store, ports, RUN_REQUEST_STUB);
      store.requestStop(RUN);

      const entry = endedEntry(store, 1);

      expect(entry.matching).toBe(false);
    });
  });
});
