import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerRuns } from './register-runs.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import type { TreeNode } from '../../tree/common/tree-node.type.ts';
import { TREE_NODE_STUB } from '../../tree/test/stubs/tree-node.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { loadedWith } from '../../tree/test/utils/tree-model.spec.util.ts';
import type { CommandRegistry, Disposed, RunDefinition, RunEvent, RunPorts, RunRequest, Terminable } from '../common/run.type.ts';
import { RunSession } from '../domain-logic/run-session.ts';
import { fakeRunPorts } from '../test/utils/fake-run-ports.spec.util.ts';

const FOLDER: RootFolder = { root: '/ws', name: 'ws' };

const TASK_TREE_NODE: TreeNode = { kind: 'task', id: 'task:/ws\0build', root: '/ws', key: 'build', packageName: 'a' };

const REQUEST: RunRequest = { root: '/ws', packageName: 'a', task: TASK_NODE_STUB, binaryPath: TURBO_BINARY_STUB.path };

const RUN: RunDefinition = { root: '/ws', id: 'build' };

const THIS_RUN: RunEvent = { definition: RUN, launchedAt: 1000 };

const ARGS = ['--skip-infer', 'run', 'build', '--filter=a', '--summarize'];

describe('FEATURE: run commands', () => {
  let execution: Terminable;
  let ports: RunPorts;
  let session: RunSession;
  let roots: RootStore;
  let refreshTask: Mock<(root: string, taskId: string) => void>;
  let commands: Map<string, (arg: unknown) => unknown>;
  let unregister: Mock<() => void>;
  let registered: Disposed;

  const command = async (name: string, arg: unknown): Promise<void> => {
    await commands.get(name)?.(arg);
  };

  beforeEach(() => {
    execution = { terminate: vi.fn() };
    ports = fakeRunPorts(execution);
    session = new RunSession(ports, []);
    roots = new RootStore();
    roots.set([FOLDER], coordinatorMock);
    refreshTask = vi.fn<(root: string, taskId: string) => void>();
    commands = new Map();
    unregister = vi.fn<() => void>();

    const register: CommandRegistry = (name, callback) => {
      const disposed: Disposed = { dispose: unregister };

      commands.set(name, callback);

      return disposed;
    };

    registered = registerRuns(session, { refreshTask }, roots, register);
  });

  it('GIVEN the run commands WHEN they are registered THEN Run Task and Stop Task are registered', () => {
    const names = commands.keys();

    expect([...names]).toStrictEqual(['turboConsole.runTask', 'turboConsole.stopTask']);
  });

  describe('GIVEN a root loaded with a binary and package a holding the build task', () => {
    beforeEach(() => {
      roots.apply('/ws', loadedWith([PACKAGE_NODE_STUB]));
    });

    it('WHEN Run Task is invoked on the task row THEN turbo runs that task with the root binary', async () => {
      await command('turboConsole.runTask', TASK_TREE_NODE);

      expect(ports.execute).toHaveBeenCalledExactlyOnceWith(REQUEST, ARGS, 1000);
    });

    it.each<[string, unknown]>([
      ['a package row', TREE_NODE_STUB],
      ['no argument (the command palette)', undefined]
    ])('WHEN Run Task is invoked on %s THEN nothing runs', async (_name, arg) => {
      await command('turboConsole.runTask', arg);

      expect(ports.execute).not.toHaveBeenCalled();
    });

    it('WHEN Run Task is invoked on a task the model no longer holds THEN nothing runs', async () => {
      roots.apply('/ws', loadedWith([]));

      await command('turboConsole.runTask', TASK_TREE_NODE);

      expect(ports.execute).not.toHaveBeenCalled();
    });

    it('WHEN Stop Task is invoked on the running task row THEN its execution is terminated', async () => {
      await command('turboConsole.runTask', TASK_TREE_NODE);

      await command('turboConsole.stopTask', TASK_TREE_NODE);

      expect(execution.terminate).toHaveBeenCalledOnce();
    });

    it('WHEN Stop Task is invoked on a package row THEN nothing is terminated', async () => {
      await command('turboConsole.runTask', TASK_TREE_NODE);

      await command('turboConsole.stopTask', TREE_NODE_STUB);

      expect(execution.terminate).not.toHaveBeenCalled();
    });

    it('WHEN the task runs THEN its tree row is refreshed', async () => {
      await command('turboConsole.runTask', TASK_TREE_NODE);

      expect(refreshTask).toHaveBeenCalledWith('/ws', 'build');
    });

    it('WHEN the task ran and the root reloads without it THEN its ended run is dropped', async () => {
      await command('turboConsole.runTask', TASK_TREE_NODE);
      session.processEnded(THIS_RUN, 0);

      roots.apply('/ws', loadedWith([]));

      expect(session.runs.get('/ws', 'build')).toBeUndefined();
    });

    it('WHEN the task ran and the root reloads with it THEN its ended run stays', async () => {
      await command('turboConsole.runTask', TASK_TREE_NODE);
      session.processEnded(THIS_RUN, 0);

      roots.apply('/ws', loadedWith([PACKAGE_NODE_STUB]));

      expect(session.runs.get('/ws', 'build')?.state).toBe('passed');
    });
  });

  describe('GIVEN the run commands were disposed', () => {
    beforeEach(() => {
      roots.apply('/ws', loadedWith([PACKAGE_NODE_STUB]));
      registered.dispose();
    });

    it('WHEN they are disposed THEN both commands are unregistered', () => {
      expect(unregister).toHaveBeenCalledTimes(2);
    });

    it('WHEN a task runs THEN no tree row is refreshed', async () => {
      await session.run(REQUEST);

      expect(refreshTask).not.toHaveBeenCalled();
    });

    it('WHEN a run ended and the root reloads without its task THEN the run stays', async () => {
      await session.run(REQUEST);
      session.processEnded(THIS_RUN, 0);

      roots.apply('/ws', loadedWith([]));

      expect(session.runs.get('/ws', 'build')?.state).toBe('passed');
    });
  });
});
