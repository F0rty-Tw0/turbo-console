import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runTask, taskEnded } from './run-flow.ts';
import { RunStore } from './run-store.ts';
import { START_TIMEOUT_MS } from '../common/run.const.ts';
import type { RunDefinition, RunPorts, RunRequest, Terminable } from '../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';
import { fakeRunPorts } from '../test/utils/fake-run-ports.spec.util.ts';

const RUN: RunDefinition = { root: '/ws', id: 'build' };
const FILTER_PACKAGE: RunRequest = { ...RUN_REQUEST_STUB, packageName: '@x/a*' };

const NOT_EXECUTABLE: Partial<RunPorts> = { canExecute: async () => Promise.resolve(false) };
const CHECK_THROWS: Partial<RunPorts> = { canExecute: async () => Promise.reject(new Error('EACCES')) };
const LAUNCH_REJECTS: Partial<RunPorts> = { execute: async () => Promise.reject(new Error('no task')) };

const stateOf = (store: RunStore): string | undefined => store.get(RUN.root, RUN.id)?.state;

describe('FEATURE: run flow, starting a run', () => {
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

  describe('GIVEN Stop is pressed while the launch is pending', () => {
    beforeEach(async () => {
      const launch = Promise.withResolvers<Terminable>();
      const execute = vi.fn().mockReturnValue(launch.promise);
      const pending = fakeRunPorts(execution, { execute });
      const running = runTask(store, pending, RUN_REQUEST_STUB);

      ports = pending;
      await vi.advanceTimersByTimeAsync(0);
      store.requestStop(RUN);
      launch.reject(new Error('no task'));
      await running;
    });

    it('WHEN the launch then rejects THEN the run is stopped', () => {
      expect(stateOf(store)).toBe('stopped');
    });

    it('WHEN the launch then rejects THEN the user is not told turbo could not start', () => {
      expect(ports.notifyFailedToStart).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN run 1 launch is pending, then run 1 task ends and run 2 starts', () => {
    let first: RunPorts;

    beforeEach(async () => {
      const launch = Promise.withResolvers<Terminable>();
      const execute = vi.fn().mockReturnValueOnce(launch.promise).mockResolvedValue(execution);
      const second = fakeRunPorts(execution, { execute, now: () => 5000 });

      first = fakeRunPorts(execution, { execute });

      const running = runTask(store, first, RUN_REQUEST_STUB);

      await vi.waitUntil(() => execute.mock.calls.length > 0);
      taskEnded(store, first, RUN);
      await runTask(store, second, RUN_REQUEST_STUB);
      launch.reject(new Error('late'));
      await running;
    });

    it('WHEN run 1 launch rejects late THEN run 2 keeps running', () => {
      expect(store.get('/ws', 'build')).toMatchObject({ launchedAt: 5000, state: 'running' });
    });

    it('WHEN run 1 launch rejects late THEN the user is told only of run 1', () => {
      expect(first.notifyFailedToStart).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN run 1 launch is pending, then run 1 task ends and run 2 starts with its own execution', () => {
    let late: Terminable;

    beforeEach(async () => {
      const launch = Promise.withResolvers<Terminable>();
      const execute = vi.fn().mockReturnValueOnce(launch.promise).mockResolvedValue(execution);
      const first = fakeRunPorts(execution, { execute });
      const second = fakeRunPorts(execution, { execute, now: () => 5000 });
      const running = runTask(store, first, RUN_REQUEST_STUB);

      late = { terminate: vi.fn() };
      await vi.waitUntil(() => execute.mock.calls.length > 0);
      taskEnded(store, first, RUN);
      await runTask(store, second, RUN_REQUEST_STUB);
      launch.resolve(late);
      await running;
    });

    it('WHEN run 1 execution arrives late THEN it is terminated', () => {
      expect(late.terminate).toHaveBeenCalledOnce();
    });

    it('WHEN run 2 is stopped after run 1 execution arrived late THEN run 2 execution is terminated', () => {
      store.requestStop(RUN);

      expect(execution.terminate).toHaveBeenCalledOnce();
    });
  });

  describe.each<[string, RunRequest, Partial<RunPorts>, RegExp]>([
    ['a binary that cannot be run', RUN_REQUEST_STUB, NOT_EXECUTABLE, /^turbo binary missing or not executable: \/bin\/turbo$/],
    ['a binary check that throws', RUN_REQUEST_STUB, CHECK_THROWS, /^EACCES$/],
    ['a package name holding filter syntax', FILTER_PACKAGE, {}, /^turbo invalid-argument: invalid turbo name "@x\/a\*": /],
    ['a launch that rejects', RUN_REQUEST_STUB, LAUNCH_REJECTS, /^no task$/]
  ])('GIVEN %s', (_name, request, overrides, reason) => {
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
      expect(failing.log).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(reason));
    });

    it('WHEN the start timeout passes THEN the user is not told again', () => {
      vi.advanceTimersByTime(START_TIMEOUT_MS);

      expect(failing.notifyFailedToStart).toHaveBeenCalledOnce();
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
});
