import type { TaskNode } from '@turbo-console/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runTask } from './run-flow.ts';
import { RunStore } from './run-store.ts';
import { TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { NOT_TURBO_RUN_TEXT } from '../common/run.const.ts';
import type { RunPorts, RunRequest, Terminable } from '../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';
import { fakeRunPorts } from '../test/utils/fake-run-ports.spec.util.ts';

const SCRIPT_TASK: TaskNode = { ...TASK_NODE_STUB, isTurboTask: false };

const SCRIPT: RunRequest = { ...RUN_REQUEST_STUB, task: SCRIPT_TASK };

describe('FEATURE: run flow, a task no turbo config defines (spec 1c-a §4.12)', () => {
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

  describe.each([
    ['run', SCRIPT],
    ['forced run', { ...SCRIPT, force: true }]
  ])('GIVEN a %s of a script', (_name, request) => {
    it('WHEN it is run THEN an info message says turbo cannot run it and nothing launches', async () => {
      await runTask(store, ports, request);

      expect(ports.info).toHaveBeenCalledExactlyOnceWith(NOT_TURBO_RUN_TEXT);
      expect(ports.execute).not.toHaveBeenCalled();
    });

    it('WHEN it is run THEN no run is stored and no watchdog is armed', async () => {
      await runTask(store, ports, request);

      expect(store.get('/ws', 'build')).toBeUndefined();
      expect(ports.after).not.toHaveBeenCalled();
    });
  });

  it('GIVEN a script that is already running WHEN Run is pressed THEN the refusal is the script text, not Already running', async () => {
    await runTask(store, ports, RUN_REQUEST_STUB);

    await runTask(store, ports, SCRIPT);

    expect(ports.info).toHaveBeenCalledExactlyOnceWith(NOT_TURBO_RUN_TEXT);
  });
});
