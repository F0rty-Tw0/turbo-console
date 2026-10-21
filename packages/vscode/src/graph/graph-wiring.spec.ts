import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import * as vscode from 'vscode';

import type { GraphContext, GraphWiring } from './common/graph-panel.type.ts';
import { createGraph } from './graph-wiring.ts';
import type { UriFake } from '../details/test/common/vscode-fakes.type.ts';
import { RootStore } from '../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../roots/test/mocks/coordinator.mock.ts';
import type { Output } from '../shared/common/output.type.ts';
import { ROOT_FOLDER_STUB } from '../tree/test/stubs/root-state.stub.ts';

type Registration = { readonly dispose: () => void };

type RegisterCommand = (command: string, callback: (arg: unknown) => unknown) => Registration;

/** `vscode` exists only inside the editor, so the module is replaced here by the calls the wiring makes. */
const editor = vi.hoisted(() => {
  const spies = { registerCommand: vi.fn<RegisterCommand>() };

  return spies;
});

vi.mock('vscode', () => {
  const joinPath = (base: UriFake, ...parts: string[]): UriFake => {
    const segments = [base.fsPath, ...parts];
    const joined: UriFake = { fsPath: segments.join('/') };

    return joined;
  };
  const file = (fsPath: string): UriFake => {
    const uri: UriFake = { fsPath };

    return uri;
  };
  const commands = { registerCommand: editor.registerCommand };
  const uri = { joinPath, file };
  const module = { Uri: uri, commands };

  return module;
});

const COMMAND = 'turboConsole.openPackageGraph';

const contextOf = (): GraphContext => {
  const update = vi.fn().mockResolvedValue(undefined);
  const store = { get: vi.fn(), update };
  const context: GraphContext = { extensionUri: vscode.Uri.file('/ext'), workspaceState: store };

  return context;
};

describe('FEATURE: the graph wiring', () => {
  let unregister: Mock<() => void>;
  let graph: GraphWiring;

  beforeEach(() => {
    const store = new RootStore();
    const output: Output = { error: vi.fn(), warn: vi.fn(), show: vi.fn(), dispose: vi.fn() };
    const open = vi.fn().mockResolvedValue(null);
    const session = { store, setPanelVisible: vi.fn() };
    const details = { open };

    store.set([ROOT_FOLDER_STUB], () => coordinatorMock());
    unregister = vi.fn<() => void>();
    editor.registerCommand.mockReset();
    editor.registerCommand.mockReturnValue({ dispose: unregister });
    graph = createGraph(contextOf(), session, details, output);
  });

  describe('GIVEN the graph is created', () => {
    it('WHEN nothing has run THEN no panel is open and no command is registered', () => {
      expect(graph.api.panels()).toStrictEqual([]);
      expect(editor.registerCommand).not.toHaveBeenCalled();
    });

    it('WHEN roots are pruned with no panel open THEN nothing throws', () => {
      expect(() => {
        graph.pruneRoots();
      }).not.toThrow();
    });
  });

  describe('GIVEN the graph is registered', () => {
    it('WHEN it registers THEN Show Package Graph is registered once', () => {
      graph.register();

      expect(editor.registerCommand).toHaveBeenCalledExactlyOnceWith(COMMAND, expect.any(Function));
    });

    it('WHEN the registration is disposed THEN the command is unregistered', () => {
      const registered = graph.register();

      registered.dispose();

      expect(unregister).toHaveBeenCalledOnce();
    });
  });
});
