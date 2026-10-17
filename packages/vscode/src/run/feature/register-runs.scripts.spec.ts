import type { PackageNode, TaskNode } from '@turbo-console/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerRuns } from './register-runs.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import { TASK_TREE_NODE_STUB } from '../../tree/test/stubs/tree-node.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { loadedWith } from '../../tree/test/utils/tree-model.spec.util.ts';
import { NOT_TURBO_FORCE_TEXT } from '../common/run.const.ts';
import type { CommandRegistry, Disposed, RunPorts, RunRequest } from '../common/run.type.ts';
import { RunSession } from '../domain-logic/run-session.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';
import { fakeRunPorts } from '../test/utils/fake-run-ports.spec.util.ts';

const FOLDER: RootFolder = { root: '/ws', name: 'ws' };

const SCRIPT_TASK: TaskNode = { ...TASK_NODE_STUB, isTurboTask: false };

const SCRIPT_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, tasks: [SCRIPT_TASK] };

const SCRIPT_REQUEST: RunRequest = { ...RUN_REQUEST_STUB, task: SCRIPT_TASK, binaryPath: TURBO_BINARY_STUB.path };

describe('FEATURE: run commands on a script', () => {
  let ports: RunPorts;
  let commands: Map<string, (arg: unknown) => unknown>;

  const command = async (name: string): Promise<void> => {
    await commands.get(name)?.(TASK_TREE_NODE_STUB);
  };

  beforeEach(() => {
    ports = fakeRunPorts({ terminate: vi.fn() });
    commands = new Map();

    const roots = new RootStore();
    const register: CommandRegistry = (name, callback) => {
      const disposed: Disposed = { dispose: vi.fn() };

      commands.set(name, callback);

      return disposed;
    };

    roots.set([FOLDER], coordinatorMock);
    roots.apply('/ws', loadedWith([SCRIPT_PACKAGE]));
    registerRuns(new RunSession(ports, []), { runChanged: vi.fn() }, roots, register);
  });

  it('GIVEN a script row WHEN Run Task is invoked THEN the script launches in its package and turbo does not', async () => {
    await command('turboConsole.runTask');

    expect(ports.executeScript).toHaveBeenCalledExactlyOnceWith(SCRIPT_REQUEST, 1000);
    expect(ports.execute).not.toHaveBeenCalled();
  });

  it('GIVEN a script row WHEN Run Task Without Cache is invoked THEN the force text shows and nothing launches', async () => {
    await command('turboConsole.runTaskWithoutCache');

    expect(ports.info).toHaveBeenCalledExactlyOnceWith(NOT_TURBO_FORCE_TEXT);
    expect(ports.executeScript).not.toHaveBeenCalled();
    expect(ports.execute).not.toHaveBeenCalled();
  });
});
