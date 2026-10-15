import { TurboException } from '@turbo-console/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PanelDryRun } from './panel-dry-run.ts';
import { flushSettles, settledFlag } from '../../roots/test/utils/deferred-ports.spec.util.ts';
import type { DetailsPorts } from '../common/details.type.ts';
import type { DeferredDryRun } from '../test/common/details.type.ts';
import { detailsPortsMock } from '../test/mocks/details-ports.mock.ts';
import { A_PACKAGE_STUB, CHECK_TASK_STUB, DETAILS_MODEL_STUB, DRY_RUN_STATE_STUB } from '../test/stubs/details-model.stub.ts';
import { deferDryRuns, dryRunAt } from '../test/utils/deferred-dry-runs.spec.util.ts';

const FAILED = new TurboException('failed', 'turbo exited 1');
const ABORTED = new TurboException('failed', 'This operation was aborted');
const UMBRELLA_ONLY = { ...A_PACKAGE_STUB, tasks: [CHECK_TASK_STUB] };
const NO_COMMAND_MODEL = { ...DETAILS_MODEL_STUB, packages: [UMBRELLA_ONLY] };

describe('FEATURE: panel dry run', () => {
  let ports: DetailsPorts;
  let runs: DeferredDryRun[];
  let changed: () => void;
  let dryRun: PanelDryRun;

  beforeEach(() => {
    ports = detailsPortsMock();
    runs = deferDryRuns(ports);
    changed = vi.fn();
    dryRun = new PanelDryRun('a', ports, changed);
    dryRun.restart(DETAILS_MODEL_STUB);
  });

  it('WHEN restarted THEN the port gets the package tasks that have a command', () => {
    expect(dryRunAt(runs, 0).request).toStrictEqual({ tasks: ['test', 'build'], packages: ['a'] });
  });

  it('WHEN restarted THEN the result is loading', () => {
    expect(dryRun.result).toStrictEqual({ phase: 'loading', states: [] });
  });

  it('WHEN the run lists states THEN the result is ready with them and the change is told once', async () => {
    dryRunAt(runs, 0).resolve([DRY_RUN_STATE_STUB]);
    await flushSettles();

    expect(dryRun.result).toStrictEqual({ phase: 'ready', states: [DRY_RUN_STATE_STUB] });
    expect(changed).toHaveBeenCalledOnce();
  });

  describe('WHEN the run rejects on its own', () => {
    beforeEach(async () => {
      dryRunAt(runs, 0).reject(FAILED);
      await flushSettles();
    });

    it('THEN the result is failed', () => {
      expect(dryRun.result).toStrictEqual({ phase: 'failed', states: [] });
    });

    it('THEN the failure is logged', () => {
      expect(ports.log).toHaveBeenCalledExactlyOnceWith('turbo failed: turbo exited 1');
    });
  });

  it('WHEN the package has no task with a command THEN the result is ready and nothing starts', () => {
    dryRun.restart(NO_COMMAND_MODEL);

    expect(dryRun.result).toStrictEqual({ phase: 'ready', states: [] });
    expect(runs).toHaveLength(1);
  });

  describe('WHEN restarted again', () => {
    beforeEach(() => {
      dryRun.restart(DETAILS_MODEL_STUB);
    });

    it('THEN the first run is aborted', () => {
      expect(dryRunAt(runs, 0).signal.aborted).toBe(true);
    });

    it('THEN the first run rejecting on its abort changes nothing', async () => {
      dryRunAt(runs, 0).reject(ABORTED);
      await flushSettles();

      expect(changed).not.toHaveBeenCalled();
      expect(ports.log).not.toHaveBeenCalled();
    });

    it('THEN a late result of the first run is dropped', async () => {
      dryRunAt(runs, 0).resolve([DRY_RUN_STATE_STUB]);
      await flushSettles();

      expect(dryRun.result.phase).toBe('loading');
    });

    it('THEN only the second run sets the result', async () => {
      dryRunAt(runs, 1).resolve([]);
      dryRunAt(runs, 0).resolve([DRY_RUN_STATE_STUB]);
      await flushSettles();

      expect(dryRun.result).toStrictEqual({ phase: 'ready', states: [] });
    });
  });

  describe('WHEN aborted', () => {
    beforeEach(() => {
      dryRun.abort();
    });

    it('THEN the run signal is aborted', () => {
      expect(dryRunAt(runs, 0).signal.aborted).toBe(true);
    });

    it('THEN its rejection changes nothing', async () => {
      dryRunAt(runs, 0).reject(ABORTED);
      await flushSettles();

      expect(changed).not.toHaveBeenCalled();
    });

    it('THEN it is idle before the aborted run settles', async () => {
      await dryRun.whenIdle();

      expect(changed).not.toHaveBeenCalled();
    });
  });

  describe('WHEN deferred', () => {
    beforeEach(() => {
      dryRunAt(runs, 0).resolve([DRY_RUN_STATE_STUB]);
      dryRun.defer();
    });

    it('THEN the run is aborted, the result is loading and the dry run is deferred', () => {
      expect(dryRunAt(runs, 0).signal.aborted).toBe(true);
      expect(dryRun.result.phase).toBe('loading');
      expect(dryRun.isDeferred).toBe(true);
    });

    it('THEN a restart is no longer deferred', () => {
      dryRun.restart(DETAILS_MODEL_STUB);

      expect(dryRun.isDeferred).toBe(false);
    });
  });

  it('WHEN the port throws before it returns a promise THEN the throw is a failure', async () => {
    vi.mocked(ports.dryRun).mockImplementation(() => {
      throw FAILED;
    });
    dryRun.restart(DETAILS_MODEL_STUB);
    await flushSettles();

    expect(dryRun.result.phase).toBe('failed');
  });

  it('WHEN the change callback throws THEN whenIdle resolves and the error is logged', async () => {
    vi.mocked(changed).mockImplementation(() => {
      throw new Error('changed failed');
    });
    dryRunAt(runs, 0).resolve([]);
    await dryRun.whenIdle();

    expect(ports.log).toHaveBeenCalledExactlyOnceWith('changed failed');
  });

  it('WHEN a run is in flight THEN whenIdle waits until it settles', async () => {
    const isIdle = settledFlag(dryRun.whenIdle());

    await flushSettles();

    const wasIdleEarly = isIdle();

    dryRunAt(runs, 0).resolve([]);
    await flushSettles();

    expect(wasIdleEarly).toBe(false);
    expect(isIdle()).toBe(true);
  });

  it('WHEN a run supersedes the one awaited THEN whenIdle waits for the newer one too', async () => {
    const isIdle = settledFlag(dryRun.whenIdle());

    dryRun.restart(DETAILS_MODEL_STUB);
    dryRunAt(runs, 0).reject(ABORTED);
    await flushSettles();

    const wasIdleEarly = isIdle();

    dryRunAt(runs, 1).resolve([]);
    await flushSettles();

    expect(wasIdleEarly).toBe(false);
    expect(isIdle()).toBe(true);
  });
});
