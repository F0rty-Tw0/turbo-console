import { join } from 'node:path';

import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerPackageActions } from './package-actions.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { CommandRegistry, Disposed } from '../../run/common/run.type.ts';
import type { PackageActionPorts } from '../common/package-action.type.ts';
import type { TreeNode } from '../common/tree-node.type.ts';
import { TASK_TREE_NODE_STUB, TREE_NODE_STUB } from '../test/stubs/tree-node.stub.ts';
import { PACKAGE_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';
import { loadedWith } from '../test/utils/tree-model.spec.util.ts';

const FOLDER: RootFolder = { root: '/ws', name: 'ws' };

const ROOT_TREE_NODE: TreeNode = { kind: 'root', id: 'root:/ws', root: '/ws', key: '/ws', packageName: null };

const GONE_TREE_NODE: TreeNode = { ...TREE_NODE_STUB, key: 'gone', packageName: 'gone' };

describe('FEATURE: package actions', () => {
  let open: Mock<(file: string) => Promise<void>>;
  let reveal: Mock<(directory: string) => Promise<void>>;
  let copy: Mock<(text: string) => Promise<void>>;
  let roots: RootStore;
  let commands: Map<string, (arg: unknown) => unknown>;
  let unregister: Mock<() => void>;
  let registered: Disposed;

  const invoke = async (name: string, arg: unknown): Promise<void> => {
    await commands.get(name)?.(arg);
  };

  beforeEach(() => {
    open = vi.fn<(file: string) => Promise<void>>().mockResolvedValue(undefined);
    reveal = vi.fn<(directory: string) => Promise<void>>().mockResolvedValue(undefined);
    copy = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    roots = new RootStore();
    roots.set([FOLDER], coordinatorMock);
    commands = new Map();
    unregister = vi.fn<() => void>();

    const ports: PackageActionPorts = { open, reveal, copy };
    const register: CommandRegistry = (name, callback) => {
      const disposed: Disposed = { dispose: unregister };

      commands.set(name, callback);

      return disposed;
    };

    registered = registerPackageActions(roots, ports, register);
  });

  it('GIVEN the package actions WHEN they are registered THEN Open, Reveal and Copy Path are registered', () => {
    const names = commands.keys();

    expect([...names]).toStrictEqual(['turboConsole.openPackageJson', 'turboConsole.revealInExplorer', 'turboConsole.copyPath']);
  });

  describe('GIVEN a root loaded with package a under packages/a', () => {
    beforeEach(() => {
      roots.apply('/ws', loadedWith([PACKAGE_NODE_STUB]));
    });

    it.each<[string, TreeNode]>([
      ['a package row', TREE_NODE_STUB],
      ['a task row', TASK_TREE_NODE_STUB]
    ])('WHEN Open package.json is invoked on %s THEN that package.json opens', async (_name, node) => {
      await invoke('turboConsole.openPackageJson', node);

      expect(open).toHaveBeenCalledExactlyOnceWith(join('/ws', 'packages', 'a', 'package.json'));
    });

    it('WHEN Reveal in Explorer is invoked on a package row THEN the package directory is revealed', async () => {
      await invoke('turboConsole.revealInExplorer', TREE_NODE_STUB);

      expect(reveal).toHaveBeenCalledExactlyOnceWith(join('/ws', 'packages', 'a'));
    });

    it('WHEN Copy Path is invoked on a package row THEN the absolute package directory is copied', async () => {
      await invoke('turboConsole.copyPath', TREE_NODE_STUB);

      expect(copy).toHaveBeenCalledExactlyOnceWith(join('/ws', 'packages', 'a'));
    });

    it.each<[string, unknown]>([
      ['a root row', ROOT_TREE_NODE],
      ['a package the model no longer holds', GONE_TREE_NODE],
      ['no argument (the command palette)', undefined]
    ])('WHEN an action is invoked on %s THEN nothing opens, reveals or copies', async (_name, arg) => {
      await invoke('turboConsole.openPackageJson', arg);
      await invoke('turboConsole.revealInExplorer', arg);
      await invoke('turboConsole.copyPath', arg);

      expect(open).not.toHaveBeenCalled();
      expect(reveal).not.toHaveBeenCalled();
      expect(copy).not.toHaveBeenCalled();
    });
  });

  it('GIVEN the package actions WHEN they are disposed THEN every command is unregistered', () => {
    registered.dispose();

    expect(unregister).toHaveBeenCalledTimes(3);
  });
});
