import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runTask, taskEnded } from './run-flow.ts';
import { RunStore } from './run-store.ts';
import { START_TIMEOUT_MS } from '../common/run.const.ts';
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

    it('WHEN 10 s have passed since the launch THEN the run ends as failed to start', () => {
      vi.advanceTimersByTime(START_TIMEOUT_MS - 4000);

      expect(stateOf(store)).toBe('failed-to-start');
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

  describe.each<[string, (store: RunStore, ports: RunPorts) => void]>([
    ['the start timeout passes', (): void => void vi.advanceTimersByTime(START_TIMEOUT_MS)],
    ['its task ends', (subject, subjectPorts): void => { taskEnded(subject, subjectPorts, RUN); }]
  ])('GIVEN a launched run the user stopped before its process started, WHEN %s', (_name, end) => {
    beforeEach(async () => {
      await runTask(store, ports, RUN_REQUEST_STUB);
      store.requestStop(RUN);
      end(store, ports);
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

      it('THEN the timeout is logged as the reason', () => {
        expect(ports.log).toHaveBeenCalledExactlyOnceWith('turbo process did not start within 10 s');
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

      taskEnded(store, ports, RUN);
      vi.advanceTimersByTime(5000);
      await runTask(store, later, RUN_REQUEST_STUB);
      vi.advanceTimersByTime(START_TIMEOUT_MS - 5000);

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

    it('WHEN its task ends after its process ended THEN the user is not told anything', () => {
      store.processEnded(RUN, 0, 4000);

      taskEnded(store, ports, RUN);

      expect(ports.notifyFailedToStart).not.toHaveBeenCalled();
    });
  });
});
