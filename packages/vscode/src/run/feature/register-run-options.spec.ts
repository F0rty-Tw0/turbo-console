import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerRunOptions } from './register-run-options.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { TASK_TREE_NODE_STUB, TREE_NODE_STUB } from '../../tree/test/stubs/tree-node.stub.ts';
import { PACKAGE_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { loadedWith } from '../../tree/test/utils/tree-model.spec.util.ts';
import type { CommandRegistry, Disposed } from '../common/run.type.ts';
import type { RunOptionsFakes } from '../test/common/run-options-fakes.type.ts';
import { PLAIN_REQUEST } from '../test/common/run-options.const.ts';
import { runOptionsFakes } from '../test/utils/run-options-fakes.spec.util.ts';

const COMMAND = 'turboConsole.runTaskWithOptions';

describe('FEATURE: register the Run with Options command', () => {
  let fakes: RunOptionsFakes;
  let commands: Map<string, (arg: unknown) => unknown>;
  let unregister: Mock<() => void>;
  let registered: Disposed;

  const invoke = async (arg: unknown): Promise<void> => {
    await commands.get(COMMAND)?.(arg);
  };

  beforeEach(() => {
    const roots = new RootStore();

    fakes = runOptionsFakes();
    commands = new Map();
    unregister = vi.fn<() => void>();
    roots.set([ROOT_FOLDER_STUB], coordinatorMock);
    roots.apply('/ws', loadedWith([PACKAGE_NODE_STUB]));

    const register: CommandRegistry = (name, callback) => {
      const disposed: Disposed = { dispose: unregister };

      commands.set(name, callback);

      return disposed;
    };

    registered = registerRunOptions(roots, fakes.ports, register);
  });

  describe('GIVEN the command registered on a root whose package a holds the build task', () => {
    it('WHEN registered THEN exactly ["turboConsole.runTaskWithOptions"] is registered', () => {
      const keys = commands.keys();
      const names = [...keys];

      expect(names).toStrictEqual([COMMAND]);
    });

    it('WHEN the command runs on a task row with an empty pick THEN run gets exactly the plain request', async () => {
      fakes.choose([]);

      await invoke(TASK_TREE_NODE_STUB);

      expect(fakes.run).toHaveBeenCalledExactlyOnceWith(PLAIN_REQUEST);
    });

    describe.each([
      ['undefined (palette)', undefined],
      ['a package row', TREE_NODE_STUB]
    ])('WHEN it runs with %s', (_name, arg) => {
      beforeEach(async () => {
        await invoke(arg);
      });

      it('THEN the picker does not open', () => {
        expect(fakes.pickMany).not.toHaveBeenCalled();
      });

      it('THEN nothing runs', () => {
        expect(fakes.run).not.toHaveBeenCalled();
      });
    });

    it('WHEN disposed THEN the command unregisters once', () => {
      registered.dispose();

      expect(unregister).toHaveBeenCalledOnce();
    });
  });
});
