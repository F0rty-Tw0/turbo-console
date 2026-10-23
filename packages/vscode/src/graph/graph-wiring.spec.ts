import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import * as vscode from 'vscode';

import type { GraphContext, GraphDetails, GraphWiring } from './common/graph-panel.type.ts';
import { createGraph } from './graph-wiring.ts';
import { GRAPH_LOADED_STUB } from './test/stubs/graph-model.stub.ts';
import { copyGraphPageRoot } from './test/utils/page-root.spec.util.ts';
import type { PanelRoots } from '../roots/common/panel-roots.type.ts';
import { RootStore } from '../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../roots/test/mocks/coordinator.mock.ts';
import { RunStore } from '../run/domain-logic/run-store.ts';
import type { Output } from '../shared/common/output.type.ts';
import type { PageRoot } from '../shared/test/common/page-root.type.ts';
import type { PanelFake, UriFake } from '../shared/test/common/vscode-fakes.type.ts';
import { webviewPanelMock } from '../shared/test/mocks/webview-panel.mock.ts';
import { ROOT_FOLDER_STUB } from '../tree/test/stubs/root-state.stub.ts';

type Registration = { readonly dispose: () => void };

type RegisterCommand = (command: string, callback: (arg: unknown) => unknown) => Registration;

type CreatePanel = (viewType: string, title: string, column: number, options: unknown) => PanelFake;

/** `vscode` exists only inside the editor, so the module is replaced here by the calls the wiring makes. */
const editor = vi.hoisted(() => {
  const spies = {
    registerCommand: vi.fn<RegisterCommand>(),
    createWebviewPanel: vi.fn<CreatePanel>(),
    showErrorMessage: vi.fn<(text: string) => Promise<undefined>>()
  };

  return spies;
});

vi.mock('vscode', () => {
  /** A class, because the run pickers' `manifestFile` checks `arg instanceof vscode.Uri`. */
  class FakeUri {
    public readonly fsPath: string;

    public constructor(fsPath: string) {
      this.fsPath = fsPath;
    }

    public static file(fsPath: string): FakeUri {
      return new FakeUri(fsPath);
    }

    public static joinPath(base: UriFake, ...parts: string[]): FakeUri {
      const segments = [base.fsPath, ...parts];

      return new FakeUri(segments.join('/'));
    }
  }

  const commands = { registerCommand: editor.registerCommand };
  const window = {
    createWebviewPanel: editor.createWebviewPanel,
    showErrorMessage: editor.showErrorMessage,
    activeTextEditor: undefined
  };
  const viewColumn = { Active: -1 };
  const module = { Uri: FakeUri, ViewColumn: viewColumn, commands, window };

  return module;
});

const COMMAND = 'turboConsole.openPackageGraph';
const TASK_COMMAND = 'turboConsole.showTaskGraph';
const TASK_ROW = { kind: 'task', root: '/ws', key: 'web#build', packageName: 'web' };

const contextOf = (page: PageRoot): GraphContext => {
  const update = vi.fn().mockResolvedValue(undefined);
  const store = { get: vi.fn(), update };
  const context: GraphContext = { extensionUri: vscode.Uri.file(page.root), workspaceState: store };

  return context;
};

/** The callback the wiring registered for `command`. */
const callbackOf = (command: string): ((arg: unknown) => unknown) => {
  const graphCall = editor.registerCommand.mock.calls.find(([registered]) => registered === command);
  const [, callback] = graphCall ?? [];

  if (callback === undefined) throw new Error(`${command} was not registered`);

  return callback;
};

const commandCallback = (): ((arg: unknown) => unknown) => callbackOf(COMMAND);

const createPanel = (): PanelFake => webviewPanelMock().fake;

const throwingCreatePanel = (): never => {
  throw new Error('no webview');
};

describe('FEATURE: the graph wiring', () => {
  let page: PageRoot;
  let store: RootStore;
  let unregister: Mock<() => void>;
  let session: PanelRoots;
  let details: GraphDetails;
  let output: Output;
  let graph: GraphWiring;

  beforeEach(() => {
    output = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), show: vi.fn(), dispose: vi.fn() };
    page = copyGraphPageRoot();
    store = new RootStore();
    store.set([ROOT_FOLDER_STUB], () => coordinatorMock());
    store.apply('/ws', GRAPH_LOADED_STUB);
    session = { store, setPanelVisible: vi.fn() };
    const open = vi.fn().mockResolvedValue(null);

    details = { open };
    unregister = vi.fn<() => void>();
    editor.registerCommand.mockReset();
    editor.registerCommand.mockReturnValue({ dispose: unregister });
    editor.createWebviewPanel.mockReset();
    editor.createWebviewPanel.mockImplementation(createPanel);
    editor.showErrorMessage.mockReset();
    editor.showErrorMessage.mockResolvedValue(undefined);
    graph = createGraph(contextOf(page), session, details, output, new RunStore());
  });

  afterEach(() => {
    page.dispose();
  });

  describe('GIVEN the graph is created', () => {
    it('WHEN nothing has run THEN no panel is open and no command is registered', () => {
      expect(graph.api.panels()).toStrictEqual([]);
      expect(editor.registerCommand).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN the graph is registered', () => {
    it('WHEN it registers THEN Show Package Graph and Show Task Graph are registered', () => {
      graph.register();

      const commands = editor.registerCommand.mock.calls.map(([command]) => command);

      expect(commands).toStrictEqual([COMMAND, TASK_COMMAND]);
    });

    it('WHEN the registration is disposed THEN both commands are unregistered', () => {
      const registered = graph.register();

      registered.dispose();

      expect(unregister).toHaveBeenCalledTimes(2);
    });

    it('WHEN Show Task Graph runs on a task row THEN the panel of its root opens', async () => {
      graph.register();

      await callbackOf(TASK_COMMAND)(TASK_ROW);

      expect(graph.api.panels()).toHaveLength(1);
    });
  });

  describe('GIVEN the editor cannot make a webview panel', () => {
    it('WHEN Show Package Graph runs THEN the failure goes to the output channel as an error', async () => {
      editor.createWebviewPanel.mockImplementationOnce(throwingCreatePanel);
      graph.register();

      await commandCallback()(undefined);

      expect(output.error).toHaveBeenCalledExactlyOnceWith('no webview');
    });

    it('WHEN Show Package Graph runs THEN no panel is listed', async () => {
      editor.createWebviewPanel.mockImplementationOnce(throwingCreatePanel);
      graph.register();

      await commandCallback()(undefined);

      expect(graph.api.panels()).toStrictEqual([]);
    });
  });

  describe('GIVEN the graph is opened through Show Package Graph', () => {
    beforeEach(async () => {
      graph.register();
      await commandCallback()(undefined);
    });

    it('WHEN the panel opens shown THEN the root session hears the graph panel shown', () => {
      expect(session.setPanelVisible).toHaveBeenCalledExactlyOnceWith('/ws', 'graph\0/ws', true);
    });

    it('WHEN the page asks for Details of a graph package THEN Details opens that root and package', async () => {
      await graph.api.receive('/ws', { type: 'openDetails', packageName: 'web' });

      expect(details.open).toHaveBeenCalledExactlyOnceWith({ root: '/ws', packageName: 'web' });
    });

    it('WHEN its root leaves the store and roots are pruned THEN the panel is closed', () => {
      store.set([], () => coordinatorMock());

      graph.pruneRoots();

      expect(graph.api.panels()).toStrictEqual([]);
    });
  });
});
