import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { registerGraph } from './register-graph.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { CommandRegistry } from '../../run/common/run.type.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { GraphOpener, RootPickPorts } from '../common/graph-panel.type.ts';
import { GRAPH_LOADED_STUB } from '../test/stubs/graph-model.stub.ts';

const COMMAND = 'turboConsole.openPackageGraph';
const OTHER_FOLDER = { root: '/other', name: 'other' };

type Registered = {
  readonly register: CommandRegistry;
  readonly run: () => unknown;
  readonly unregister: Mock<() => void>;
  readonly ids: string[];
};

const registrationMock = (): Registered => {
  const handlers = new Map<string, (arg: unknown) => unknown>();
  const ids: string[] = [];
  const unregister = vi.fn<() => void>();
  const register: CommandRegistry = (command, callback) => {
    handlers.set(command, callback);
    ids.push(command);

    const disposable = { dispose: unregister };

    return disposable;
  };
  const run = (): unknown => handlers.get(COMMAND)?.(undefined);
  const registered: Registered = { register, run, unregister, ids };

  return registered;
};

const openerMock = (): GraphOpener => {
  const open = vi.fn<GraphOpener['open']>().mockReturnValue(null);
  const opener: GraphOpener = { open, dispose: vi.fn() };

  return opener;
};

const portsOf = (picked: string | undefined): RootPickPorts => {
  const pick = vi.fn<RootPickPorts['pick']>().mockResolvedValue(picked);
  const ports: RootPickPorts = { activeFile: () => null, rootOf: () => null, pick, info: vi.fn(), error: vi.fn(), log: vi.fn() };

  return ports;
};

const throwingOpen = (): never => {
  throw new Error('ENOENT: index.html');
};

const storeOf = (folders: RootFolder[]): RootStore => {
  const store = new RootStore();

  store.set(folders, () => coordinatorMock());
  store.apply('/ws', GRAPH_LOADED_STUB);

  return store;
};

describe('FEATURE: the Show Package Graph command', () => {
  it('GIVEN it is registered THEN the command id is turboConsole.openPackageGraph', () => {
    const registered = registrationMock();

    registerGraph(openerMock(), storeOf([ROOT_FOLDER_STUB]), portsOf(undefined), registered.register);

    expect(registered.ids).toStrictEqual([COMMAND]);
  });

  it('GIVEN a resolvable root WHEN the command runs THEN that root opens', async () => {
    const panels = openerMock();
    const registered = registrationMock();

    registerGraph(panels, storeOf([ROOT_FOLDER_STUB]), portsOf(undefined), registered.register);
    await registered.run();

    expect(panels.open).toHaveBeenCalledExactlyOnceWith('/ws');
  });

  it('GIVEN two roots and a cancelled pick WHEN the command runs THEN nothing opens', async () => {
    const panels = openerMock();
    const registered = registrationMock();

    registerGraph(panels, storeOf([ROOT_FOLDER_STUB, OTHER_FOLDER]), portsOf(undefined), registered.register);
    await registered.run();

    expect(panels.open).not.toHaveBeenCalled();
  });

  describe('GIVEN a panel that cannot be opened', () => {
    it('WHEN the command runs THEN the failure is logged and the user is told to see Output', async () => {
      const panels = openerMock();
      const registered = registrationMock();
      const ports = portsOf(undefined);

      vi.mocked(panels.open).mockImplementation(throwingOpen);
      registerGraph(panels, storeOf([ROOT_FOLDER_STUB]), ports, registered.register);
      await registered.run();

      expect(ports.log).toHaveBeenCalledExactlyOnceWith('ENOENT: index.html');
      expect(ports.error).toHaveBeenCalledExactlyOnceWith('Could not open the Package Graph. See Output.');
    });

    it('WHEN the command runs THEN the command resolves', async () => {
      const panels = openerMock();
      const registered = registrationMock();

      vi.mocked(panels.open).mockImplementation(throwingOpen);
      registerGraph(panels, storeOf([ROOT_FOLDER_STUB]), portsOf(undefined), registered.register);

      await expect(registered.run()).resolves.toBeUndefined();
    });
  });

  it('GIVEN it is registered WHEN it is disposed THEN the command is removed and the panels are disposed', () => {
    const panels = openerMock();
    const registered = registrationMock();
    const graph = registerGraph(panels, storeOf([ROOT_FOLDER_STUB]), portsOf(undefined), registered.register);

    graph.dispose();

    expect(registered.unregister).toHaveBeenCalledOnce();
    expect(panels.dispose).toHaveBeenCalledOnce();
  });
});
