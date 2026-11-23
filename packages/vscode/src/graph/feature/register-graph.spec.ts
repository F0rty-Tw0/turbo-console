import type { GraphHostMessage } from '@turbo-console/webview-ui';
import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { registerGraph } from './register-graph.ts';
import type { RootFolder } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { CommandRegistry } from '../../run/common/run.type.ts';
import { viewMock } from '../../shared/test/mocks/panel-view.mock.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { GraphOpener, OpenGraphPanel, RootPickPorts } from '../common/graph-panel.type.ts';
import { GRAPH_LOADED_STUB } from '../test/stubs/graph-model.stub.ts';

const COMMAND = 'turboConsole.openPackageGraph';
const TASK_COMMAND = 'turboConsole.showTaskGraph';
const ALL_TASKS_COMMAND = 'turboConsole.showAllTaskGraphs';
const FOCUS_COMMAND = 'turboConsole.focusPackageInGraph';
const MODULES_COMMAND = 'turboConsole.showPackageModules';
const PACKAGE_ROW = { kind: 'pkg', root: '/ws', packageName: 'web' };
const TASK_ROW = { kind: 'task', root: '/ws', key: 'web#build', packageName: 'web' };
const OTHER_FOLDER = { root: '/other', name: 'other' };

type Registered = {
  readonly register: CommandRegistry;
  readonly run: () => unknown;
  readonly runTaskGraph: (arg: unknown) => unknown;
  readonly runAllTasks: () => unknown;
  readonly runFocus: (arg: unknown) => unknown;
  readonly runModules: (arg: unknown) => unknown;
  readonly ids: string[];
  readonly disposed: string[];
};

const registrationMock = (): Registered => {
  const handlers = new Map<string, (arg: unknown) => unknown>();
  const ids: string[] = [];
  const disposed: string[] = [];
  const register: CommandRegistry = (command, callback) => {
    handlers.set(command, callback);
    ids.push(command);

    const dispose = (): void => {
      disposed.push(command);
    };
    const disposable = { dispose };

    return disposable;
  };
  const run = (): unknown => handlers.get(COMMAND)?.(undefined);
  const runTaskGraph = (arg: unknown): unknown => handlers.get(TASK_COMMAND)?.(arg);
  const runAllTasks = (): unknown => handlers.get(ALL_TASKS_COMMAND)?.(undefined);
  const runFocus = (arg: unknown): unknown => handlers.get(FOCUS_COMMAND)?.(arg);
  const runModules = (arg: unknown): unknown => handlers.get(MODULES_COMMAND)?.(arg);
  const registered: Registered = { register, run, runTaskGraph, runAllTasks, runFocus, runModules, ids, disposed };

  return registered;
};

const openerMock = (): GraphOpener => {
  const open = vi.fn<GraphOpener['open']>().mockReturnValue(null);
  const opener: GraphOpener = { open, dispose: vi.fn() };

  return opener;
};

const panelOf = (show: Mock<OpenGraphPanel['session']['show']>): OpenGraphPanel => {
  const session: OpenGraphPanel['session'] = { receive: vi.fn(), show, dispose: vi.fn() };
  const { view } = viewMock<GraphHostMessage>(true);
  const panel: OpenGraphPanel = { root: '/ws', view, session, posted: [] };

  return panel;
};

const portsOf = (picked: string | undefined): RootPickPorts => {
  const pickMany = vi.fn<RootPickPorts['pickMany']>().mockResolvedValue(undefined);
  const pick = vi.fn<RootPickPorts['pick']>().mockResolvedValue(picked);
  const ports: RootPickPorts = {
    activeFile: () => null,
    rootOf: () => null,
    pick,
    pickMany,
    pickOne: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
    scriptsShown: () => false
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
  describe('GIVEN a resolvable root', () => {
    it('WHEN the command runs THEN that root opens', async () => {
      const panels = openerMock();
      const registered = registrationMock();

      registerGraph(panels, storeOf([ROOT_FOLDER_STUB]), portsOf(undefined), registered.register);
      await registered.run();

      expect(panels.open).toHaveBeenCalledExactlyOnceWith('/ws');
    });

    it('WHEN Show All Task Graphs runs THEN that root opens', async () => {
      const panels = openerMock();
      const registered = registrationMock();

      registerGraph(panels, storeOf([ROOT_FOLDER_STUB]), portsOf(undefined), registered.register);
      await registered.runAllTasks();

      expect(panels.open).toHaveBeenCalledExactlyOnceWith('/ws');
    });
  });

  describe('GIVEN two roots and a cancelled pick', () => {
    it('WHEN the command runs THEN nothing opens', async () => {
      const panels = openerMock();
      const registered = registrationMock();

      registerGraph(panels, storeOf([ROOT_FOLDER_STUB, OTHER_FOLDER]), portsOf(undefined), registered.register);
      await registered.run();

      expect(panels.open).not.toHaveBeenCalled();
    });
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

  describe('GIVEN a task row', () => {
    it('WHEN Show Task Graph runs THEN that root opens', async () => {
      const panels = openerMock();
      const registered = registrationMock();

      registerGraph(panels, storeOf([ROOT_FOLDER_STUB]), portsOf(undefined), registered.register);
      await registered.runTaskGraph(TASK_ROW);

      expect(panels.open).toHaveBeenCalledExactlyOnceWith('/ws');
    });
  });

  describe('GIVEN a package row', () => {
    it('WHEN Focus on Graph runs THEN that root opens', () => {
      const panels = openerMock();
      const registered = registrationMock();

      registerGraph(panels, storeOf([ROOT_FOLDER_STUB]), portsOf(undefined), registered.register);
      registered.runFocus(PACKAGE_ROW);

      expect(panels.open).toHaveBeenCalledExactlyOnceWith('/ws');
    });

    it('WHEN Show Package Modules runs THEN that root opens on the modules of the package', async () => {
      const panels = openerMock();
      const registered = registrationMock();
      const show = vi.fn<OpenGraphPanel['session']['show']>();

      vi.mocked(panels.open).mockReturnValue(panelOf(show));
      registerGraph(panels, storeOf([ROOT_FOLDER_STUB]), portsOf(undefined), registered.register);
      await registered.runModules(PACKAGE_ROW);

      expect(panels.open).toHaveBeenCalledExactlyOnceWith('/ws');
      expect(show).toHaveBeenCalledExactlyOnceWith({ type: 'showModules', name: 'web' });
    });
  });

  describe('GIVEN it is registered', () => {
    it('THEN the command ids are Show Package Graph, Show Task Graph, Show All Task Graphs, Focus on Graph and Show Package Modules', () => {
      const registered = registrationMock();

      registerGraph(openerMock(), storeOf([ROOT_FOLDER_STUB]), portsOf(undefined), registered.register);

      expect(registered.ids).toStrictEqual([COMMAND, TASK_COMMAND, ALL_TASKS_COMMAND, FOCUS_COMMAND, MODULES_COMMAND]);
    });

    it('WHEN it is disposed THEN every command is removed and the panels are disposed', () => {
      const panels = openerMock();
      const registered = registrationMock();
      const graph = registerGraph(panels, storeOf([ROOT_FOLDER_STUB]), portsOf(undefined), registered.register);

      graph.dispose();

      expect(registered.disposed).toStrictEqual([COMMAND, TASK_COMMAND, ALL_TASKS_COMMAND, FOCUS_COMMAND, MODULES_COMMAND]);
      expect(panels.dispose).toHaveBeenCalledOnce();
    });
  });
});
