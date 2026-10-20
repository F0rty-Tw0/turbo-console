import type { PackageNode, TaskNode } from '@turbo-console/core';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerCopy } from './register-copy.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { TreeNode } from '../../tree/common/tree-node.type.ts';
import { TASK_TREE_NODE_STUB, TREE_NODE_STUB } from '../../tree/test/stubs/tree-node.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { loadedWith } from '../../tree/test/utils/tree-model.spec.util.ts';
import { NAME_NOT_COPYABLE_TEXT, SHELL_NOT_COPYABLE_TEXT } from '../common/copy.const.ts';
import type { CopyPorts } from '../common/copy.type.ts';
import type { CommandRegistry, Disposed } from '../common/run.type.ts';

const FOLDER: RootFolder = { root: '/ws', name: 'ws' };

const taskRowOf = (packageName: string, taskId: string): TreeNode => {
  const row: TreeNode = { ...TASK_TREE_NODE_STUB, key: taskId, packageName };

  return row;
};

const packageHolding = (name: string, task: TaskNode): PackageNode => {
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, name, tasks: [task] };

  return pkg;
};

describe('FEATURE: copy command', () => {
  let shell: string;
  let ports: CopyPorts;
  let write: Mock<(text: string) => Promise<void>>;
  let info: Mock<(text: string) => void>;
  let roots: RootStore;
  let commands: Map<string, (arg: unknown) => unknown>;
  let unregister: Mock<() => void>;
  let registered: Disposed;

  const copy = async (arg: unknown): Promise<void> => {
    await commands.get('turboConsole.copyCommand')?.(arg);
  };

  beforeEach(() => {
    shell = '/usr/bin/zsh';
    write = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    info = vi.fn<(text: string) => void>();
    const shellPath = (): string => shell;

    ports = { shell: shellPath, write, info };
    roots = new RootStore();
    roots.set([FOLDER], coordinatorMock);
    commands = new Map();
    unregister = vi.fn<() => void>();

    const register: CommandRegistry = (name, callback) => {
      const disposed: Disposed = { dispose: unregister };

      commands.set(name, callback);

      return disposed;
    };

    registered = registerCopy(roots, ports, register);
  });

  it('GIVEN the copy command WHEN it is registered THEN Copy Command is registered', () => {
    const names = commands.keys();

    expect([...names]).toStrictEqual(['turboConsole.copyCommand']);
  });

  describe('GIVEN a root loaded with package a holding the build task', () => {
    beforeEach(() => {
      roots.apply('/ws', loadedWith([PACKAGE_NODE_STUB]));
    });

    it('WHEN Copy Command is invoked on the task row THEN the turbo command is copied', async () => {
      await copy(TASK_TREE_NODE_STUB);

      expect(write).toHaveBeenCalledExactlyOnceWith('turbo run build --filter=a');
    });

    it('WHEN a turbo task is copied THEN no information message shows', async () => {
      await copy(TASK_TREE_NODE_STUB);

      expect(info).not.toHaveBeenCalled();
    });

    describe('GIVEN a script of the package', () => {
      const scriptNamed = (name: string): TaskNode => {
        const script: TaskNode = { ...TASK_NODE_STUB, id: `a#${name}`, name, isTurboTask: false };

        return script;
      };

      it('WHEN Copy Command is invoked on its row THEN the package manager command is copied and says where to run it', async () => {
        roots.apply('/ws', loadedWith([packageHolding('a', scriptNamed('lint'))]));

        await copy(taskRowOf('a', 'a#lint'));

        expect(write).toHaveBeenCalledExactlyOnceWith('pnpm run lint');
        expect(info).toHaveBeenCalledExactlyOnceWith('Copied. Run it in `packages/a`.');
      });

      it.each(['.', ''])('WHEN the package is the root package (path %j) THEN it says to run it in the repo root', async (path) => {
        const holder = packageHolding('a', scriptNamed('lint'));
        const rootPackage: PackageNode = { ...holder, path };

        roots.apply('/ws', loadedWith([rootPackage]));

        await copy(taskRowOf('a', 'a#lint'));

        expect(write).toHaveBeenCalledExactlyOnceWith('pnpm run lint');
        expect(info).toHaveBeenCalledExactlyOnceWith('Copied. Run it in the repo root.');
      });

      it('WHEN its name is refused THEN nothing is copied and the unsafe text shows', async () => {
        roots.apply('/ws', loadedWith([packageHolding('a', scriptNamed('x y'))]));

        await copy(taskRowOf('a', 'a#x y'));

        expect(write).not.toHaveBeenCalled();
        expect(info).toHaveBeenCalledExactlyOnceWith("Turbo Console can't run a script named `x y` safely.");
      });

      it('WHEN it is an atom-umbrella row with no command THEN nothing is copied and the unsafe text shows', async () => {
        const script = scriptNamed('lint');
        const umbrella: TaskNode = { ...script, kind: 'atom-umbrella', command: null };

        roots.apply('/ws', loadedWith([packageHolding('a', umbrella)]));

        await copy(taskRowOf('a', 'a#lint'));

        expect(write).not.toHaveBeenCalled();
        expect(info).toHaveBeenCalledExactlyOnceWith("Turbo Console can't run a script named `lint` safely.");
      });

      it('WHEN its package path leaves the root THEN nothing is copied and the unsafe text shows, as Run refuses it', async () => {
        const holder = packageHolding('a', scriptNamed('lint'));
        const outside: PackageNode = { ...holder, path: '../x' };

        roots.apply('/ws', loadedWith([outside]));

        await copy(taskRowOf('a', 'a#lint'));

        expect(write).not.toHaveBeenCalled();
        expect(info).toHaveBeenCalledExactlyOnceWith("Turbo Console can't run a script named `lint` safely.");
      });
    });

    it('WHEN the shell is unknown THEN the command is copied for posix', async () => {
      shell = '';
      const spaced = { ...TASK_NODE_STUB, id: 'a#x y', name: 'x y' };

      roots.apply('/ws', loadedWith([packageHolding('a', spaced)]));

      await copy(taskRowOf('a', 'a#x y'));

      expect(write).toHaveBeenCalledExactlyOnceWith("turbo run 'x y' --filter=a");
    });

    it('WHEN the shell is cmd and the command can be quoted THEN it is copied with double quotes', async () => {
      shell = 'C:\\Windows\\System32\\cmd.exe';
      const spaced = { ...TASK_NODE_STUB, id: 'a#x y', name: 'x y' };

      roots.apply('/ws', loadedWith([packageHolding('a', spaced)]));

      await copy(taskRowOf('a', 'a#x y'));

      expect(write).toHaveBeenCalledExactlyOnceWith('turbo run "x y" --filter=a');
    });

    it.each<[string, unknown]>([
      ['a package row', TREE_NODE_STUB],
      ['no argument (the command palette)', undefined]
    ])('WHEN Copy Command is invoked on %s THEN nothing is copied and nothing is said', async (_name, arg) => {
      await copy(arg);

      expect(write).not.toHaveBeenCalled();
      expect(info).not.toHaveBeenCalled();
    });

    it('WHEN Copy Command is invoked on a task the model no longer holds THEN nothing is copied', async () => {
      roots.apply('/ws', loadedWith([]));

      await copy(TASK_TREE_NODE_STUB);

      expect(write).not.toHaveBeenCalled();
    });
  });

  describe.each<[string, string, string]>([
    ['cmd', 'cmd.exe', 'p%q'],
    ['pwsh', 'C:\\Program Files\\PowerShell\\7\\pwsh.exe', 'p\\']
  ])('GIVEN the %s shell and a task name it cannot quote', (_kind, shellPath, name) => {
    beforeEach(() => {
      const unquotable = { ...TASK_NODE_STUB, id: 'a#p', name };

      shell = shellPath;
      roots.apply('/ws', loadedWith([packageHolding('a', unquotable)]));
    });

    it('WHEN Copy Command is invoked THEN the shell notice shows and nothing is copied', async () => {
      await copy(taskRowOf('a', 'a#p'));

      expect(info).toHaveBeenCalledExactlyOnceWith(SHELL_NOT_COPYABLE_TEXT);
      expect(write).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a task name turbo reads as pkg#task', () => {
    beforeEach(() => {
      const hashed = { ...TASK_NODE_STUB, id: 'a#b#c', name: 'b#c' };

      roots.apply('/ws', loadedWith([packageHolding('a', hashed)]));
    });

    it('WHEN Copy Command is invoked THEN the name notice shows and nothing is copied', async () => {
      await copy(taskRowOf('a', 'a#b#c'));

      expect(info).toHaveBeenCalledExactlyOnceWith(NAME_NOT_COPYABLE_TEXT);
      expect(write).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a task whose name read fails with an ordinary error', () => {
    beforeEach(() => {
      const failing: TaskNode = {
        ...TASK_NODE_STUB,
        get name(): string {
          throw new Error('boom');
        }
      };

      roots.apply('/ws', loadedWith([packageHolding('a', failing)]));
    });

    it('WHEN Copy Command is invoked THEN the error propagates and nothing is copied or said', async () => {
      const invoked = copy(TASK_TREE_NODE_STUB);

      await expect(invoked).rejects.toThrow('boom');
      expect(write).not.toHaveBeenCalled();
      expect(info).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a package name turbo cannot take as a filter', () => {
    beforeEach(() => {
      roots.apply('/ws', loadedWith([packageHolding('a*', TASK_NODE_STUB)]));
    });

    it('WHEN Copy Command is invoked THEN the filter notice shows and nothing is copied', async () => {
      await copy(taskRowOf('a*', 'build'));

      expect(info).toHaveBeenCalledExactlyOnceWith(NAME_NOT_COPYABLE_TEXT);
      expect(write).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a single-package root holding the // package with the build task', () => {
    beforeEach(() => {
      const loaded = loadedWith([packageHolding('//', { ...TASK_NODE_STUB, id: '//#build' })]);
      const model = { ...loaded.model, singlePackage: true };

      roots.apply('/ws', { ...loaded, model });
    });

    it('WHEN Copy Command is invoked on the // task row THEN the copied command ends with --single-package', async () => {
      await copy(taskRowOf('//', '//#build'));

      expect(write).toHaveBeenCalledExactlyOnceWith('turbo run build --filter=// --single-package');
    });
  });

  it('GIVEN the copy command WHEN it is disposed THEN its command is unregistered', () => {
    registered.dispose();

    expect(unregister).toHaveBeenCalledOnce();
  });
});
