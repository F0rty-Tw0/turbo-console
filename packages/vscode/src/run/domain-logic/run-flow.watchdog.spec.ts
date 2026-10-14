import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { failStart, runTask } from './run-flow.ts';
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
});
