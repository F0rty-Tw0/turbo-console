import { join } from 'node:path';

import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runTask } from './run-flow.ts';
import { RunStore } from './run-store.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import { ROOT_STATE_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { RunDefinition, RunPorts, RunRequest, TaskTarget, Terminable } from '../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';
import { fakeRunPorts } from '../test/utils/fake-run-ports.spec.util.ts';
import { runRequestOf } from '../utils/run-target.util.ts';

const SINGLE: RunRequest = { ...RUN_REQUEST_STUB, packageName: '//', singlePackage: true };

const ARGS = ['--skip-infer', 'run', 'build', '--filter=//', '--summarize', '--single-package'];

const FORMAT: TaskNode = { ...TASK_NODE_STUB, id: '//#format', name: 'format', isTurboTask: false };

const ROOT_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, name: '//', path: '', tasks: [FORMAT] };

const SINGLE_MODEL: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, singlePackage: true, packages: [ROOT_PACKAGE] };

const SINGLE_STATE: RootState = { ...ROOT_STATE_STUB, binary: TURBO_BINARY_STUB, model: SINGLE_MODEL };

const FORMAT_RUN: RunDefinition = { root: '/ws', id: '//#format' };

const FORMAT_TARGET: TaskTarget = { definition: FORMAT_RUN, packageName: '//' };

/** The run of the unkeyed `format` script as the Run command builds it from a single-package model. */
const formatRequest = (): RunRequest => {
  const request = runRequestOf(FORMAT_TARGET, SINGLE_STATE, false);

  if (request === null) throw new Error('no run request for //#format');

  return request;
};

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

  describe('GIVEN the unkeyed format script of the // package', () => {
    it('WHEN it runs THEN the package manager runs it in the repo root', async () => {
      await runTask(store, ports, formatRequest());

      expect(ports.executeScript).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ packageDir: join('/ws') }), 1000);
    });

    it('WHEN it runs THEN turbo is not launched, so no turbo or --single-package arguments', async () => {
      await runTask(store, ports, formatRequest());

      expect(ports.execute).not.toHaveBeenCalled();
    });
  });
});
