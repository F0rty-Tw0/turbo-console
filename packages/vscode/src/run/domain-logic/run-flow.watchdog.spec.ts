import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runTask, taskEnded } from './run-flow.ts';
import { RunStore } from './run-store.ts';
import { START_TIMEOUT_MS, START_WAIT_TEXT } from '../common/run.const.ts';
import type { RunDefinition, RunPorts, Terminable } from '../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';
import { fakeRunPorts } from '../test/utils/fake-run-ports.spec.util.ts';

const RUN: RunDefinition = { root: '/ws', id: 'build' };

const stateOf = (store: RunStore): string | undefined => store.get(RUN.root, RUN.id)?.state;

describe('FEATURE: run flow, a start that never happens', () => {
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

  describe('GIVEN a launch that never settles', () => {
    let running: Promise<void>;

    beforeEach(async () => {
      const launch = Promise.withResolvers<Terminable>();
      const execute = vi.fn().mockReturnValue(launch.promise);
      const pending = fakeRunPorts(execution, { execute });

      running = runTask(store, pending, RUN_REQUEST_STUB);
      await vi.advanceTimersByTimeAsync(0);
    });

    it('WHEN the start timeout passes after the launch THEN the run ends as failed to start', () => {
      vi.advanceTimersByTime(START_TIMEOUT_MS);

      expect(stateOf(store)).toBe('failed-to-start');
    });

    it('WHEN the start timeout has not passed THEN the run keeps running', () => {
      vi.advanceTimersByTime(START_TIMEOUT_MS - 1);

      expect(stateOf(store)).toBe('running');
    });

    it('WHEN it is still pending THEN runTask has not settled', async () => {
      const settled = await Promise.race([running.then(() => true), Promise.resolve(false)]);

      expect(settled).toBe(false);
    });

    it('WHEN its task ended and a new run started before the first timeout THEN that timeout leaves the new run alone', async () => {
      const later = fakeRunPorts(execution, { now: () => 6000 });

      taskEnded(store, ports, RUN);
      vi.advanceTimersByTime(5000);
      await runTask(store, later, RUN_REQUEST_STUB);
      vi.advanceTimersByTime(START_TIMEOUT_MS - 5000);

      expect(stateOf(store)).toBe('running');
    });
  });

  describe('GIVEN a launch that resolves 4 s after the run launched', () => {
    let late: PromiseWithResolvers<Terminable>;

    beforeEach(async () => {
      const execute = vi.fn().mockImplementation(async () => late.promise);
      const pending = fakeRunPorts(execution, { execute });

      late = Promise.withResolvers<Terminable>();

      const running = runTask(store, pending, RUN_REQUEST_STUB);

      await vi.advanceTimersByTimeAsync(0);
      vi.advanceTimersByTime(4000);
      late.resolve(execution);
      await running;
    });

    it('WHEN 10 s have passed since the launch THEN the run keeps running', () => {
      vi.advanceTimersByTime(START_TIMEOUT_MS - 4000);

      expect(stateOf(store)).toBe('running');
    });
  });

  describe('GIVEN a launch that resolves only after the start timeout', () => {
    it('WHEN its execution arrives THEN it is terminated', async () => {
      const launch = Promise.withResolvers<Terminable>();
      const execute = vi.fn().mockReturnValue(launch.promise);
      const pending = fakeRunPorts(execution, { execute });
      const running = runTask(store, pending, RUN_REQUEST_STUB);

      await vi.advanceTimersByTimeAsync(0);
      vi.advanceTimersByTime(START_TIMEOUT_MS);
      launch.resolve(execution);
      await running;

      expect(execution.terminate).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN a change listener that throws when a run starts', () => {
    beforeEach(() => {
      store.onDidChange((entry) => {
        if (entry.state === 'running') throw new Error('listener');
      });
    });

    it('WHEN the run throws and the start timeout passes THEN the run is not left running', async () => {
      await expect(runTask(store, ports, RUN_REQUEST_STUB)).rejects.toThrow('listener');
      vi.advanceTimersByTime(START_TIMEOUT_MS);

      expect(stateOf(store)).toBe('failed-to-start');
    });
  });

  describe('GIVEN a launched run the user stopped before its process started', () => {
    beforeEach(async () => {
      await runTask(store, ports, RUN_REQUEST_STUB);
      store.requestStop(RUN);
    });

    it('WHEN the start timeout passes THEN the run waits for its task to end', () => {
      vi.advanceTimersByTime(START_TIMEOUT_MS);

      expect(stateOf(store)).toBe('running');
    });

    describe('WHEN its task ends', () => {
      beforeEach(() => {
        taskEnded(store, ports, RUN);
      });

      it('THEN the run is stopped', () => {
        expect(stateOf(store)).toBe('stopped');
      });

      it('THEN the user is not told turbo could not start', () => {
        expect(ports.notifyFailedToStart).not.toHaveBeenCalled();
      });

      it('THEN no reason is logged', () => {
        expect(ports.log).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a launched run', () => {
    beforeEach(async () => {
      await runTask(store, ports, RUN_REQUEST_STUB);
    });

    describe('WHEN the start timeout passes before its process starts', () => {
      beforeEach(() => {
        vi.advanceTimersByTime(START_TIMEOUT_MS);
      });

      it('THEN the run keeps running', () => {
        expect(stateOf(store)).toBe('running');
      });

      it('THEN its execution is not terminated', () => {
        expect(execution.terminate).not.toHaveBeenCalled();
      });

      it('THEN the user is not told turbo could not start', () => {
        expect(ports.notifyFailedToStart).not.toHaveBeenCalled();
      });

      it('THEN the wait is logged once, as a trace', () => {
        expect(ports.log).toHaveBeenCalledExactlyOnceWith(START_WAIT_TEXT);
      });
    });

    it('WHEN its process starts before the start timeout THEN the timeout logs nothing', () => {
      store.processStarted(RUN, 1200);

      vi.advanceTimersByTime(START_TIMEOUT_MS);

      expect(ports.log).not.toHaveBeenCalled();
    });

    it('WHEN the start timeout passes and its process then starts THEN the run runs with that start', () => {
      vi.advanceTimersByTime(START_TIMEOUT_MS);

      store.processStarted(RUN, 13_000);

      expect(store.get(RUN.root, RUN.id)).toMatchObject({ state: 'running', processStartedAt: 13_000 });
    });

    it('WHEN the start timeout passes and its process then ends with exit code 0 THEN the run passed', () => {
      vi.advanceTimersByTime(START_TIMEOUT_MS);
      store.processStarted(RUN, 13_000);

      store.processEnded(RUN, 0, 30_000);

      expect(stateOf(store)).toBe('passed');
    });

    it('WHEN the start timeout passes and the user then stops it THEN the running run is terminated by that Stop', () => {
      vi.advanceTimersByTime(START_TIMEOUT_MS);

      store.requestStop(RUN);

      expect(store.get(RUN.root, RUN.id)).toMatchObject({ state: 'running', stopRequested: true });
      expect(execution.terminate).toHaveBeenCalledOnce();
    });

    it('WHEN its process starts before the start timeout THEN the timeout does nothing', () => {
      store.processStarted(RUN, 1200);

      vi.advanceTimersByTime(START_TIMEOUT_MS);

      expect(stateOf(store)).toBe('running');
    });

    it('WHEN its task ends with no process end THEN the entry ends as failed to start', () => {
      taskEnded(store, ports, RUN);

      expect(stateOf(store)).toBe('failed-to-start');
    });

    it('WHEN its task ends with no process end THEN the user is told turbo could not start', () => {
      taskEnded(store, ports, RUN);

      expect(ports.notifyFailedToStart).toHaveBeenCalledOnce();
    });

    it('WHEN its task ends with no process end THEN the task end is logged as the reason', () => {
      taskEnded(store, ports, RUN);

      expect(ports.log).toHaveBeenCalledExactlyOnceWith('task ended before its process started');
    });

    it('WHEN its task ends with no process end THEN its execution is not terminated', () => {
      taskEnded(store, ports, RUN);

      expect(execution.terminate).not.toHaveBeenCalled();
    });

    it('WHEN the user stopped it and its task ends THEN its execution was terminated once, by the Stop', () => {
      store.requestStop(RUN);

      taskEnded(store, ports, RUN);

      expect(execution.terminate).toHaveBeenCalledOnce();
    });

    it('WHEN its task ends after its process ended THEN the user is not told anything', () => {
      store.processEnded(RUN, 0, 4000);

      taskEnded(store, ports, RUN);

      expect(ports.notifyFailedToStart).not.toHaveBeenCalled();
    });
  });
});
