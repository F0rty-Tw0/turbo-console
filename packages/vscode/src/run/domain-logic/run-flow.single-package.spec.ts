import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runTask } from './run-flow.ts';
import { RunStore } from './run-store.ts';
import type { RunPorts, RunRequest, Terminable } from '../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';
import { fakeRunPorts } from '../test/utils/fake-run-ports.spec.util.ts';

const SINGLE: RunRequest = { ...RUN_REQUEST_STUB, packageName: '//', singlePackage: true };

const ARGS = ['--skip-infer', 'run', 'build', '--filter=//', '--summarize', '--single-package'];

describe('FEATURE: run flow, single-package root', () => {
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

  describe('GIVEN a single-package request', () => {
    it('WHEN it runs THEN the arguments carry --single-package after the summary flag', async () => {
      await runTask(store, ports, SINGLE);

      expect(ports.execute).toHaveBeenCalledExactlyOnceWith(SINGLE, ARGS, 1000);
    });

    it('WHEN it is forced too THEN --force stays last', async () => {
      const forced: RunRequest = { ...SINGLE, force: true };

      await runTask(store, ports, forced);

      expect(ports.execute).toHaveBeenCalledExactlyOnceWith(forced, [...ARGS, '--force'], 1000);
    });
  });
});
