import { join } from 'node:path';

import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerOpenSpec } from './open-spec.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { LOADED_MODEL_STUB } from '../../roots/test/stubs/root.stub.ts';
import type { CommandRegistry, Disposed } from '../../run/common/run.type.ts';
import { OPEN_SPEC_COMMAND } from '../common/atom.const.ts';
import type { OpenSpecPorts } from '../common/open-spec.type.ts';
import type { TreeNode } from '../common/tree-node.type.ts';
import { FILE_B, PKG, ROOT } from '../test/common/atom-load.const.ts';
import { FILE_TREE_NODE_STUB, UMBRELLA_TREE_NODE_STUB } from '../test/stubs/tree-node.stub.ts';
import { atomModelOf } from '../test/utils/atom-model.spec.util.ts';

const FOLDER: RootFolder = { root: ROOT, name: 'ws' };

const ESCAPING_PATHS = ['../../etc/passwd', '/etc/passwd'];

const fileNodeOf = (specPath: string): TreeNode => {
  const key = `${PKG}#e2e-ci--${specPath}`;
  const node: TreeNode = { ...FILE_TREE_NODE_STUB, id: `task:${ROOT}\0${key}`, key };

  return node;
};

const PACKAGE_ROW: TreeNode = { ...UMBRELLA_TREE_NODE_STUB, kind: 'pkg', key: PKG };

const GONE_PACKAGE_FILE_ROW: TreeNode = { ...FILE_TREE_NODE_STUB, packageName: 'gone' };

const OTHER_ROOT_FILE_ROW: TreeNode = { ...FILE_TREE_NODE_STUB, root: '/other' };

describe('FEATURE: Open Spec command', () => {
  let open: Mock<(file: string) => Promise<void>>;
  let error: Mock<(text: string) => void>;
  let roots: RootStore;
  let commands: Map<string, (arg: unknown) => unknown>;
  let unregister: Mock<() => void>;
  let registered: Disposed;

  const invoke = async (arg: unknown): Promise<void> => {
    await commands.get(OPEN_SPEC_COMMAND)?.(arg);
  };

  const loadSpecPaths = (specPaths: string[]): void => {
    roots.apply(ROOT, { ...LOADED_MODEL_STUB, model: atomModelOf(specPaths) });
  };

  beforeEach(() => {
    open = vi.fn<(file: string) => Promise<void>>().mockResolvedValue(undefined);
    error = vi.fn<(text: string) => void>();
    roots = new RootStore();
    roots.set([FOLDER], coordinatorMock);
    commands = new Map();
    unregister = vi.fn<() => void>();

    const ports: OpenSpecPorts = { open, error };
    const register: CommandRegistry = (name, callback) => {
      const disposed: Disposed = { dispose: unregister };

      commands.set(name, callback);

      return disposed;
    };

    registered = registerOpenSpec(roots, ports, register);
  });

  it('GIVEN Open Spec WHEN it is registered THEN only its own command is registered', () => {
    const names = commands.keys();

    expect([...names]).toStrictEqual([OPEN_SPEC_COMMAND]);
  });

  it('GIVEN Open Spec WHEN it is disposed THEN its command is unregistered', () => {
    registered.dispose();

    expect(unregister).toHaveBeenCalledTimes(1);
  });

  describe('GIVEN a root loaded with the spec files a.spec.ts and "b fails.spec.ts"', () => {
    beforeEach(() => {
      loadSpecPaths(['tests/a.spec.ts', 'tests/b fails.spec.ts']);
    });

    it('WHEN it is invoked on the spaced file row THEN that spec opens under its package and no error shows', async () => {
      await invoke({ ...FILE_TREE_NODE_STUB, id: `task:${ROOT}\0${FILE_B}`, key: FILE_B });

      expect(open).toHaveBeenCalledExactlyOnceWith(join('/ws', 'packages', 'e2e', 'tests', 'b fails.spec.ts'));
      expect(error).not.toHaveBeenCalled();
    });

    it.each<[string, unknown]>([
      ['a package row', PACKAGE_ROW],
      ['the umbrella row, which is no file', UMBRELLA_TREE_NODE_STUB],
      ['a file row the model no longer holds', fileNodeOf('tests/gone.spec.ts')],
      ['a file row of a package the model does not hold', GONE_PACKAGE_FILE_ROW],
      ['a root the store does not hold', OTHER_ROOT_FILE_ROW],
      ['no argument (the command palette)', undefined]
    ])('WHEN it is invoked on %s THEN nothing opens and no error shows', async (_name, arg) => {
      await invoke(arg);

      expect(open).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a root loaded with spec paths that leave the package', () => {
    beforeEach(() => {
      loadSpecPaths(ESCAPING_PATHS);
    });

    it.each(ESCAPING_PATHS)('WHEN it is invoked on the row of %j THEN nothing opens and the refusal shows once', async (specPath) => {
      await invoke(fileNodeOf(specPath));

      expect(open).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledExactlyOnceWith(`Refused to open "${specPath}": it leaves the package directory.`);
    });
  });

  describe('GIVEN a root with no loaded model', () => {
    it('WHEN it is invoked on a file row THEN nothing opens and no error shows', async () => {
      await invoke(fileNodeOf('tests/gone.spec.ts'));

      expect(open).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    });
  });
});
