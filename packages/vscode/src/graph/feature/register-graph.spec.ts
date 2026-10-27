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
const TASK_COMMAND = 'turboConsole.showTaskGraph';
const ALL_TASKS_COMMAND = 'turboConsole.showAllTaskGraphs';
const FOCUS_COMMAND = 'turboConsole.focusPackageInGraph';
const PACKAGE_ROW = { kind: 'pkg', root: '/ws', packageName: 'web' };
const TASK_ROW = { kind: 'task', root: '/ws', key: 'web#build', packageName: 'web' };
const OTHER_FOLDER = { root: '/other', name: 'other' };

type Registered = {
  readonly register: CommandRegistry;
  readonly run: () => unknown;
  readonly runTaskGraph: (arg: unknown) => unknown;
  readonly runAllTasks: () => unknown;
  readonly runFocus: (arg: unknown) => unknown;
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
  const runTaskGraph = (arg: unknown): unknown => handlers.get(TASK_COMMAND)?.(arg);
  const runAllTasks = (): unknown => handlers.get(ALL_TASKS_COMMAND)?.(undefined);
  const runFocus = (arg: unknown): unknown => handlers.get(FOCUS_COMMAND)?.(arg);
  const registered: Registered = { register, run, runTaskGraph, runAllTasks, runFocus, unregister, ids };

  return registered;
};

const openerMock = (): GraphOpener => {
  const open = vi.fn<GraphOpener['open']>().mockReturnValue(null);
  const opener: GraphOpener = { open, dispose: vi.fn() };

  return opener;
};

const portsOf = (picked: string | undefined): RootPickPorts => {
  const pickMany = vi.fn<RootPickPorts['pickMany']>().mockResolvedValue(undefined);
  const pick = vi.fn<RootPickPorts['pick']>().mockResolvedValue(picked);
  const ports: RootPickPorts = {
    activeFile: () => null,
    rootOf: () => null,
    pick,
    pickMany,
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn()
  };

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
  it('GIVEN it is registered THEN the command ids are Show Package Graph, Show Task Graph, Show All Task Graphs and Focus on Graph', () => {
    const registered = registrationMock();

    registerGraph(openerMock(), storeOf([ROOT_FOLDER_STUB]), portsOf(undefined), registered.register);

    expect(registered.ids).toStrictEqual([COMMAND, TASK_COMMAND, ALL_TASKS_COMMAND, FOCUS_COMMAND]);
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

  it('GIVEN a task row WHEN Show Task Graph runs THEN that root opens', async () => {
    const panels = openerMock();
    const registered = registrationMock();

    registerGraph(panels, storeOf([ROOT_FOLDER_STUB]), portsOf(undefined), registered.register);
    await registered.runTaskGraph(TASK_ROW);

    expect(panels.open).toHaveBeenCalledExactlyOnceWith('/ws');
  });

  it('GIVEN a package row WHEN Focus on Graph runs THEN that root opens', () => {
    const panels = openerMock();
    const registered = registrationMock();

    registerGraph(panels, storeOf([ROOT_FOLDER_STUB]), portsOf(undefined), registered.register);
    registered.runFocus(PACKAGE_ROW);

    expect(panels.open).toHaveBeenCalledExactlyOnceWith('/ws');
  });

  it('GIVEN a resolvable root WHEN Show All Task Graphs runs THEN that root opens', async () => {
    const panels = openerMock();
    const registered = registrationMock();

    registerGraph(panels, storeOf([ROOT_FOLDER_STUB]), portsOf(undefined), registered.register);
    await registered.runAllTasks();

    expect(panels.open).toHaveBeenCalledExactlyOnceWith('/ws');
  });

  it('GIVEN it is registered WHEN it is disposed THEN every command is removed and the panels are disposed', () => {
    const panels = openerMock();
    const registered = registrationMock();
    const graph = registerGraph(panels, storeOf([ROOT_FOLDER_STUB]), portsOf(undefined), registered.register);

    graph.dispose();

    expect(registered.unregister).toHaveBeenCalledTimes(4);
    expect(panels.dispose).toHaveBeenCalledOnce();
  });
});
