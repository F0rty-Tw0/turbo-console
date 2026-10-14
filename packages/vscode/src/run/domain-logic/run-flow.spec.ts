import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runTask } from './run-flow.ts';
import { RunStore } from './run-store.ts';
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
});
