import type { DryRunRequest } from '@turbo-console/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { editorPredictionPorts } from './prediction-ports.ts';
import type { RootEntry, RootState, Roots } from '../../roots/common/coordinator.type.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import type { Output } from '../../shared/common/output.type.ts';
import { outputMock } from '../../shared/test/mocks/output.mock.ts';
import type { PredictionHostPorts } from '../common/prediction.type.ts';
import { ROOT_STATE_STUB } from '../test/stubs/root-state.stub.ts';

const DRY_RUN_REQUEST: DryRunRequest = { tasks: ['build'], packages: ['@fx/a'], singlePackage: false };

const LOADED_STATE: RootState = { ...ROOT_STATE_STUB, binary: TURBO_BINARY_STUB };

describe('FEATURE: editor cache prediction ports', () => {
  let output: Output;
  let ports: PredictionHostPorts;

  beforeEach(() => {
    const entry: RootEntry = { state: LOADED_STATE, coordinator: coordinatorMock() };
    const entries = new Map([['/ws', entry]]);
    const roots: Roots = { get: (root: string) => entries.get(root), all: vi.fn(), onDidChange: vi.fn() };

    output = outputMock();
    ports = editorPredictionPorts(roots, output);
  });

  it('WHEN the binary of the loaded root is read THEN it is the turbo the root loaded with', () => {
    expect(ports.binaryOf('/ws')).toBe(TURBO_BINARY_STUB);
  });

  it('WHEN the binary of an unknown root is read THEN it is null', () => {
    expect(ports.binaryOf('/gone')).toBeNull();
  });

  it('WHEN the dry run starts with an aborted signal THEN core aborts it before the binary is run', async () => {
    const controller = new AbortController();

    controller.abort();

    const dryRun = ports.dryRun(TURBO_BINARY_STUB, DRY_RUN_REQUEST, controller.signal);

    await expect(dryRun).rejects.toThrow('was aborted');
  });

  it('WHEN a line is logged THEN the output gets it as one warning', () => {
    ports.log('prediction /ws: dry run failed: boom');

    expect(output.warn).toHaveBeenCalledExactlyOnceWith('prediction /ws: dry run failed: boom');
  });

  describe('GIVEN fake timers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(5_000);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('WHEN now is read THEN it is the clock', () => {
      expect(ports.now()).toBe(5_000);
    });

    describe('GIVEN a run scheduled after 300 ms', () => {
      let run: Mock<() => void>;

      beforeEach(() => {
        run = vi.fn<() => void>();
        ports.after(run, 300);
      });

      it('WHEN 299 ms pass THEN it has not run', () => {
        vi.advanceTimersByTime(299);

        expect(run).not.toHaveBeenCalled();
      });

      it('WHEN 300 ms pass THEN it runs once', () => {
        vi.advanceTimersByTime(300);

        expect(run).toHaveBeenCalledOnce();
      });
    });

    it('WHEN the timer is cancelled THEN the run never happens', () => {
      const run = vi.fn();
      const timer = ports.after(run, 300);

      ports.cancel(timer);
      vi.advanceTimersByTime(1_000);

      expect(run).not.toHaveBeenCalled();
    });
  });
});
