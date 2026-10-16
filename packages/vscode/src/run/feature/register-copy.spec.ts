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

    it('WHEN the task is no turbo task THEN an info message says there is no command and nothing is copied', async () => {
      const script = { ...TASK_NODE_STUB, isTurboTask: false };

      roots.apply('/ws', loadedWith([packageHolding('a', script)]));

      await copy(TASK_TREE_NODE_STUB);

      expect(info).toHaveBeenCalledExactlyOnceWith("This script isn't a turbo task, so there is no turbo command to copy.");
      expect(write).not.toHaveBeenCalled();
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

  it('GIVEN the copy command WHEN it is disposed THEN its command is unregistered', () => {
    registered.dispose();

    expect(unregister).toHaveBeenCalledOnce();
  });
});
