import type { PackageNode, TaskNode } from '@turbo-console/core';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerRuns } from './register-runs.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { TURBO_BINARY_STUB } from '../../roots/test/stubs/root.stub.ts';
import { TASK_TREE_NODE_STUB, TREE_NODE_STUB } from '../../tree/test/stubs/tree-node.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { loadedWith } from '../../tree/test/utils/tree-model.spec.util.ts';
import type {
  CommandRegistry,
  Disposed,
  RunDefinition,
  RunEntry,
  RunEvent,
  RunPorts,
  RunRequest,
  Terminable
} from '../common/run.type.ts';
import { RunSession } from '../domain-logic/run-session.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';
import { fakeRunPorts } from '../test/utils/fake-run-ports.spec.util.ts';
import { noScriptText, unsafeScriptText } from '../utils/run-text.util.ts';

const FOLDER: RootFolder = { root: '/ws', name: 'ws' };

const REQUEST: RunRequest = { ...RUN_REQUEST_STUB, binaryPath: TURBO_BINARY_STUB.path };

const SCRIPT_TASK: TaskNode = { ...TASK_NODE_STUB, isTurboTask: false };

const SCRIPT_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, tasks: [SCRIPT_TASK] };

const UNSAFE_TASK: TaskNode = { ...TASK_NODE_STUB, name: 'a b' };

const UNSAFE_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, tasks: [UNSAFE_TASK] };

const RUN: RunDefinition = { root: '/ws', id: 'build' };

const THIS_RUN: RunEvent = { definition: RUN, launchedAt: 1000 };

const ARGS = ['--skip-infer', 'run', 'build', '--filter=a', '--summarize'];

describe('FEATURE: run commands', () => {
  let execution: Terminable;
  let ports: RunPorts;
  let session: RunSession;
  let roots: RootStore;
  let runChanged: Mock<(entry: RunEntry) => void>;
  let info: Mock<(text: string) => void>;
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
    runChanged = vi.fn<(entry: RunEntry) => void>();
    info = vi.fn<(text: string) => void>();
    commands = new Map();
    unregister = vi.fn<() => void>();

    const register: CommandRegistry = (name, callback) => {
      const disposed: Disposed = { dispose: unregister };

      commands.set(name, callback);

      return disposed;
    };

    registered = registerRuns(session, { runChanged }, roots, register, info);
  });

  it('GIVEN the run commands WHEN they are registered THEN Run, Run Without Cache, Run Without Turbo and Stop Task are registered', () => {
    const names = commands.keys();
    const expected = [
      'turboConsole.runTask',
      'turboConsole.runTaskWithoutCache',
      'turboConsole.runTaskWithoutTurbo',
      'turboConsole.stopTask'
    ];

    expect([...names]).toStrictEqual(expected);
  });

  describe('GIVEN a cached model published before the binary resolved', () => {
    let whenSettled: Mock<() => Promise<void>>;
    let unsubscribe: Mock<() => void>;

    const spyUnsubscribe = (): Mock<() => void> => {
      const subscribe = roots.onDidChange.bind(roots);
      const spy = vi.fn<() => void>();

      vi.spyOn(roots, 'onDidChange').mockImplementation((listener) => {
        spy.mockImplementation(subscribe(listener));

        return spy;
      });

      return spy;
    };

    beforeEach(() => {
      const loaded = loadedWith([PACKAGE_NODE_STUB]);

      roots.apply('/ws', { ...loaded, binary: null });
      whenSettled = vi.mocked(roots.get('/ws')?.coordinator.whenSettled ?? vi.fn());
      unsubscribe = spyUnsubscribe();
    });

    describe('WHEN Run Task is invoked and the binary is published while the load keeps running', () => {
      beforeEach(async () => {
        whenSettled.mockReturnValue(new Promise(() => undefined));

        const running = command('turboConsole.runTask', TASK_TREE_NODE_STUB);

        roots.apply('/ws', loadedWith([PACKAGE_NODE_STUB]));
        await running;
      });

      it('THEN turbo runs that task with the binary', () => {
        expect(ports.execute).toHaveBeenCalledExactlyOnceWith(REQUEST, ARGS, 1000);
      });

      it('THEN its store listener is removed', () => {
        expect(unsubscribe).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN Run Task is invoked and the load then settles with the binary', () => {
      beforeEach(async () => {
        whenSettled.mockImplementation(async () => {
          roots.apply('/ws', loadedWith([PACKAGE_NODE_STUB]));
          await Promise.resolve();
        });

        await command('turboConsole.runTask', TASK_TREE_NODE_STUB);
      });

      it('THEN turbo runs that task with it', () => {
        expect(ports.execute).toHaveBeenCalledExactlyOnceWith(REQUEST, ARGS, 1000);
      });

      it('THEN its store listener is removed', () => {
        expect(unsubscribe).toHaveBeenCalledOnce();
      });
    });

    describe('WHEN Run Task is invoked and the load settles without a binary', () => {
      beforeEach(async () => {
        await command('turboConsole.runTask', TASK_TREE_NODE_STUB);
      });

      it('THEN it waited for the settle and nothing runs', () => {
        expect(whenSettled).toHaveBeenCalledOnce();
        expect(ports.execute).not.toHaveBeenCalled();
      });

      it('THEN its store listener is removed', () => {
        expect(unsubscribe).toHaveBeenCalledOnce();
      });
    });
  });

  describe('GIVEN a root loaded with a binary and package a holding the build task', () => {
    beforeEach(() => {
      roots.apply('/ws', loadedWith([PACKAGE_NODE_STUB]));
    });

    it('WHEN Run Task is invoked on the task row THEN turbo runs that task with the root binary', async () => {
      await command('turboConsole.runTask', TASK_TREE_NODE_STUB);

      expect(ports.execute).toHaveBeenCalledExactlyOnceWith(REQUEST, ARGS, 1000);
    });

    it('WHEN Run Task Without Cache is invoked on the task row THEN turbo runs it with --force and the entry is forced', async () => {
      await command('turboConsole.runTaskWithoutCache', TASK_TREE_NODE_STUB);

      expect(ports.execute).toHaveBeenCalledExactlyOnceWith({ ...REQUEST, force: true }, [...ARGS, '--force'], 1000);
      expect(session.runs.get('/ws', 'build')?.force).toBe(true);
    });

    it('WHEN Run Task is invoked on the task row THEN the entry is not forced', async () => {
      await command('turboConsole.runTask', TASK_TREE_NODE_STUB);

      expect(session.runs.get('/ws', 'build')?.force).toBe(false);
    });

    it('WHEN Run Task Without Cache is invoked while the task runs THEN it is refused', async () => {
      await command('turboConsole.runTask', TASK_TREE_NODE_STUB);

      await command('turboConsole.runTaskWithoutCache', TASK_TREE_NODE_STUB);

      expect(ports.info).toHaveBeenCalledExactlyOnceWith('Already running.');
    });

    it.each<[string, unknown]>([
      ['a package row', TREE_NODE_STUB],
      ['no argument (the command palette)', undefined]
    ])('WHEN Run Task, Run Task Without Cache or Run Without Turbo is invoked on %s THEN nothing runs', async (_name, arg) => {
      await command('turboConsole.runTask', arg);
      await command('turboConsole.runTaskWithoutCache', arg);
      await command('turboConsole.runTaskWithoutTurbo', arg);

      expect(ports.execute).not.toHaveBeenCalled();
      expect(ports.executeScript).not.toHaveBeenCalled();
    });

    it('WHEN Run Without Turbo is invoked on the task row THEN the package manager runs its script, not turbo', async () => {
      await command('turboConsole.runTaskWithoutTurbo', TASK_TREE_NODE_STUB);

      expect(ports.executeScript).toHaveBeenCalledExactlyOnceWith({ ...REQUEST, task: SCRIPT_TASK }, 1000);
      expect(ports.execute).not.toHaveBeenCalled();
    });

    it('WHEN Run Without Turbo is invoked THEN the task row shows the running entry, not forced', async () => {
      await command('turboConsole.runTaskWithoutTurbo', TASK_TREE_NODE_STUB);

      expect(session.runs.get('/ws', 'build')).toMatchObject({ state: 'running', force: false });
    });

    const NO_SCRIPT_BODIES: [string, string | null][] = [
      ['no command', null],
      ['a whitespace-only command', '  ']
    ];

    const runWithoutTurboOnBody = async (body: string | null): Promise<void> => {
      const task: TaskNode = { ...TASK_NODE_STUB, command: body };
      const pkg: PackageNode = { ...PACKAGE_NODE_STUB, tasks: [task] };

      roots.apply('/ws', loadedWith([pkg]));
      await command('turboConsole.runTaskWithoutTurbo', TASK_TREE_NODE_STUB);
    };

    it.each(NO_SCRIPT_BODIES)('WHEN Run Without Turbo is invoked on a task with %s THEN it says so', async (_name, body) => {
      await runWithoutTurboOnBody(body);

      expect(info).toHaveBeenCalledExactlyOnceWith(noScriptText('build'));
    });

    it.each(NO_SCRIPT_BODIES)('WHEN Run Without Turbo is invoked on a task with %s THEN nothing runs', async (_name, body) => {
      await runWithoutTurboOnBody(body);

      expect(ports.executeScript).not.toHaveBeenCalled();
      expect(ports.execute).not.toHaveBeenCalled();
    });

    it('WHEN Run Without Turbo is invoked on a task whose name needs quoting THEN it is refused', async () => {
      roots.apply('/ws', loadedWith([UNSAFE_PACKAGE]));

      await command('turboConsole.runTaskWithoutTurbo', TASK_TREE_NODE_STUB);

      expect(ports.info).toHaveBeenCalledExactlyOnceWith(unsafeScriptText('a b'));
    });

    it('WHEN Run Without Turbo is invoked on a task whose name needs quoting THEN nothing runs', async () => {
      roots.apply('/ws', loadedWith([UNSAFE_PACKAGE]));

      await command('turboConsole.runTaskWithoutTurbo', TASK_TREE_NODE_STUB);

      expect(ports.executeScript).not.toHaveBeenCalled();
    });

    it('WHEN Run Without Turbo is invoked while the task runs THEN it is refused', async () => {
      await command('turboConsole.runTask', TASK_TREE_NODE_STUB);

      await command('turboConsole.runTaskWithoutTurbo', TASK_TREE_NODE_STUB);

      expect(ports.info).toHaveBeenCalledExactlyOnceWith('Already running.');
      expect(ports.executeScript).not.toHaveBeenCalled();
    });

    it('WHEN Run Task is invoked on a task the model no longer holds THEN nothing runs', async () => {
      roots.apply('/ws', loadedWith([]));

      await command('turboConsole.runTask', TASK_TREE_NODE_STUB);

      expect(ports.execute).not.toHaveBeenCalled();
    });

    it('WHEN Stop Task is invoked on the running task row THEN its execution is terminated', async () => {
      await command('turboConsole.runTask', TASK_TREE_NODE_STUB);

      await command('turboConsole.stopTask', TASK_TREE_NODE_STUB);

      expect(execution.terminate).toHaveBeenCalledOnce();
    });

    it('WHEN the running task turned into a script on a reload THEN Stop Task still terminates it', async () => {
      await command('turboConsole.runTask', TASK_TREE_NODE_STUB);
      roots.apply('/ws', loadedWith([SCRIPT_PACKAGE]));

      await command('turboConsole.stopTask', TASK_TREE_NODE_STUB);

      expect(execution.terminate).toHaveBeenCalledOnce();
    });

    it('WHEN Stop Task is invoked on a package row THEN nothing is terminated', async () => {
      await command('turboConsole.runTask', TASK_TREE_NODE_STUB);

      await command('turboConsole.stopTask', TREE_NODE_STUB);

      expect(execution.terminate).not.toHaveBeenCalled();
    });

    it('WHEN the task runs THEN the tree is told of its run entry', async () => {
      await command('turboConsole.runTask', TASK_TREE_NODE_STUB);

      expect(runChanged).toHaveBeenCalledWith(expect.objectContaining({ root: '/ws', taskId: 'build', state: 'running' }));
    });

    it('WHEN the task ran and the root reloads without it THEN its ended run is dropped', async () => {
      await command('turboConsole.runTask', TASK_TREE_NODE_STUB);
      session.processEnded(THIS_RUN, 0);

      roots.apply('/ws', loadedWith([]));

      expect(session.runs.get('/ws', 'build')).toBeUndefined();
    });

    it('WHEN the task ran and the root reloads with it THEN its ended run stays', async () => {
      await command('turboConsole.runTask', TASK_TREE_NODE_STUB);
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

    it('WHEN they are disposed THEN every command is unregistered', () => {
      expect(unregister).toHaveBeenCalledTimes(4);
    });

    it('WHEN a task runs THEN the tree is not told', async () => {
      await session.run(REQUEST);

      expect(runChanged).not.toHaveBeenCalled();
    });

    it('WHEN a run ended and the root reloads without its task THEN the run stays', async () => {
      await session.run(REQUEST);
      session.processEnded(THIS_RUN, 0);

      roots.apply('/ws', loadedWith([]));

      expect(session.runs.get('/ws', 'build')?.state).toBe('passed');
    });
  });
});
