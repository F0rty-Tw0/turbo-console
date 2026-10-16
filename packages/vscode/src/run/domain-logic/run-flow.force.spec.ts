import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runTask } from './run-flow.ts';
import { RunStore } from './run-store.ts';
import type { RunPorts, RunRequest, Terminable } from '../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';
import { fakeRunPorts } from '../test/utils/fake-run-ports.spec.util.ts';

const FORCED: RunRequest = { ...RUN_REQUEST_STUB, force: true };

const ARGS = ['--skip-infer', 'run', 'build', '--filter=a', '--summarize'];

describe('FEATURE: run flow, Run Without Cache', () => {
  let store: RunStore;
  let ports: RunPorts;

  beforeEach(() => {
    vi.useFakeTimers();
    store = new RunStore();

    const execution: Terminable = { terminate: vi.fn() };

    ports = fakeRunPorts(execution);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GIVEN a forced request', () => {
    it('WHEN it is run THEN the arguments end with the summary flag and --force', async () => {
      await runTask(store, ports, FORCED);

      expect(ports.execute).toHaveBeenCalledExactlyOnceWith(FORCED, [...ARGS, '--force'], 1000);
    });

    it('WHEN it is run THEN the stored entry is marked forced', async () => {
      await runTask(store, ports, FORCED);

      expect(store.get('/ws', 'build')?.force).toBe(true);
    });

    it('WHEN the task is already running THEN it is refused like Run, with one launch', async () => {
      const first = runTask(store, ports, RUN_REQUEST_STUB);
      const second = runTask(store, ports, FORCED);

      await Promise.all([first, second]);

      expect(ports.info).toHaveBeenCalledExactlyOnceWith('Already running.');
      expect(ports.execute).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN a plain request', () => {
    it('WHEN it is run THEN the arguments carry no --force and the entry is not forced', async () => {
      await runTask(store, ports, RUN_REQUEST_STUB);

      expect(ports.execute).toHaveBeenCalledExactlyOnceWith(RUN_REQUEST_STUB, ARGS, 1000);
      expect(store.get('/ws', 'build')?.force).toBe(false);
    });
  });
});
