import { join } from 'node:path';

import type { PackageNode, TaskNode } from '@turbo-console/core';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerPackageActions } from './package-actions.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { CommandRegistry, Disposed } from '../../run/common/run.type.ts';
import type { PackageActionPorts, TextSelection } from '../common/package-action.type.ts';
import type { TreeNode } from '../common/tree-node.type.ts';
import { TASK_TREE_NODE_STUB, TREE_NODE_STUB } from '../test/stubs/tree-node.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';
import { selectionOnLine } from '../test/utils/text-selection.spec.util.ts';
import { loadedWith } from '../test/utils/tree-model.spec.util.ts';

const FOLDER: RootFolder = { root: '/ws', name: 'ws' };

const ROOT_TREE_NODE: TreeNode = { kind: 'root', id: 'root:/ws', root: '/ws', key: '/ws', packageName: null };

const MANIFEST_LINES = ['{', '  "scripts": {', '    "build": "tsc"', '  }', '}'];

const MANIFEST = MANIFEST_LINES.join('\n');

const BUILD_SELECTION = selectionOnLine(2, 4, 18);

const TOP_SELECTION = selectionOnLine(0, 0, 0);

const PREFIXED_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'a#build' };

const PREFIXED_PACKAGE: PackageNode = { ...PACKAGE_NODE_STUB, tasks: [PREFIXED_TASK] };

const GONE_TREE_NODE: TreeNode = { ...TREE_NODE_STUB, key: 'gone', packageName: 'gone' };

describe('FEATURE: package actions', () => {
  let read: Mock<(file: string) => Promise<string | null>>;
  let open: Mock<(file: string, selection: TextSelection | null) => Promise<void>>;
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
    read = vi.fn<(file: string) => Promise<string | null>>().mockResolvedValue(MANIFEST);
    open = vi.fn<(file: string, selection: TextSelection | null) => Promise<void>>().mockResolvedValue(undefined);
    reveal = vi.fn<(directory: string) => Promise<void>>().mockResolvedValue(undefined);
    copy = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    roots = new RootStore();
    roots.set([FOLDER], coordinatorMock);
    commands = new Map();
    unregister = vi.fn<() => void>();

    const ports: PackageActionPorts = { read, open, reveal, copy };
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

    const manifestFile = join('/ws', 'packages', 'a', 'package.json');

    it('WHEN Open package.json is invoked on a package row THEN that package.json opens with no selection', async () => {
      await invoke('turboConsole.openPackageJson', TREE_NODE_STUB);

      expect(open).toHaveBeenCalledExactlyOnceWith(manifestFile, null);
      expect(read).not.toHaveBeenCalled();
    });

    it('WHEN Open package.json is invoked on a task row THEN that package.json opens with the task script selected', async () => {
      await invoke('turboConsole.openPackageJson', TASK_TREE_NODE_STUB);

      expect(read).toHaveBeenCalledExactlyOnceWith(manifestFile);
      expect(open).toHaveBeenCalledExactlyOnceWith(manifestFile, BUILD_SELECTION);
    });

    it('WHEN the task row is a task id with a package prefix THEN its name, not its id, is looked up', async () => {
      roots.apply('/ws', loadedWith([PREFIXED_PACKAGE]));

      await invoke('turboConsole.openPackageJson', { ...TASK_TREE_NODE_STUB, key: 'a#build' });

      expect(open).toHaveBeenCalledExactlyOnceWith(manifestFile, BUILD_SELECTION);
    });

    it.each<[string, string | null]>([
      ['a manifest without that script', '{ "scripts": { "test": "vitest" } }'],
      ['a manifest that is not JSON', 'not json'],
      ['a manifest that cannot be read', null]
    ])(
      'WHEN the task row is opened on %s THEN the file opens with an empty selection at the top, clearing any old one',
      async (_name, text) => {
        read.mockResolvedValue(text);

        await invoke('turboConsole.openPackageJson', TASK_TREE_NODE_STUB);

        expect(open).toHaveBeenCalledExactlyOnceWith(manifestFile, TOP_SELECTION);
      }
    );

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
      expect(read).not.toHaveBeenCalled();
      expect(reveal).not.toHaveBeenCalled();
      expect(copy).not.toHaveBeenCalled();
    });
  });

  it('GIVEN the package actions WHEN they are disposed THEN every command is unregistered', () => {
    registered.dispose();

    expect(unregister).toHaveBeenCalledTimes(3);
  });
});
