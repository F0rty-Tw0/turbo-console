import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Disposable } from 'vscode';

import { registerTree } from './register-tree.ts';
import type { Session } from '../../roots/common/coordinator.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import type { Output } from '../../shared/common/output.type.ts';
import type { ScopeStore, TreeContext } from '../common/tree-context.type.ts';
import type { PackagesTreeApi } from '../common/tree-node.type.ts';
import { packagesTreeApiMock } from '../test/mocks/packages-tree-api.mock.ts';

type CommandCallback = () => unknown;

type TreeViewFake = {
  readonly visible: boolean;
  readonly onDidChangeVisibility: Mock<() => Disposable>;
  readonly dispose: Mock<() => void>;
};

const SCOPE_KEY = 'turboConsole.scopeShown';

const disposableFake = (): Disposable => {
  const disposable: Disposable = { dispose: vi.fn() };

  return disposable;
};

/** `vscode` exists only inside the editor, so the module is replaced here by the calls `register-tree.ts` makes. */
const editor = vi.hoisted(() => {
  const spies = {
    createTreeView: vi.fn<(id: string, options: unknown) => unknown>(),
    registerCommand: vi.fn<(name: string, callback: () => unknown) => Disposable>(),
    executeCommand: vi.fn<(command: string, key: string, value: boolean) => Promise<void>>(),
    onDidChangeConfiguration: vi.fn<(listener: () => void) => Disposable>()
  };

  return spies;
});

vi.mock('vscode', () => {
  const window = { createTreeView: editor.createTreeView };
  const commands = { registerCommand: editor.registerCommand, executeCommand: editor.executeCommand };
  const workspace = { onDidChangeConfiguration: editor.onDidChangeConfiguration };
  const module = { window, commands, workspace };

  return module;
});

describe('FEATURE: registerTree scope toggle', () => {
  let calls: string[];
  let stored: Map<string, unknown>;
  let commands: Map<string, CommandCallback>;
  let tree: PackagesTreeApi;
  let context: TreeContext;
  let session: Session;
  let output: Output;

  const registerWith = (): void => {
    registerTree(context, session, tree, output);
  };

  const invoke = async (name: string): Promise<void> => {
    await commands.get(name)?.();
  };

  beforeEach(() => {
    calls = [];
    stored = new Map();
    commands = new Map();
    tree = packagesTreeApiMock();
    vi.mocked(tree.setScopeShown).mockImplementation((value) => {
      calls.push(`setScopeShown:${String(value)}`);
    });

    const workspaceState: ScopeStore = {
      get: (key) => stored.get(key),
      update: async (key, value) => {
        calls.push(`update:${String(value)}`);
        stored.set(key, value);

        return Promise.resolve();
      }
    };

    context = { subscriptions: [], workspaceState };
    session = {
      store: new RootStore(),
      setWorkspaceFolders: vi.fn(async () => Promise.resolve([])),
      setVisible: vi.fn(),
      setPanelVisible: vi.fn(),
      request: vi.fn(),
      changed: vi.fn()
    };
    output = { error: vi.fn(), warn: vi.fn(), show: vi.fn(), dispose: vi.fn() };

    editor.createTreeView.mockReset();
    editor.registerCommand.mockReset();
    editor.executeCommand.mockReset();
    editor.onDidChangeConfiguration.mockReset();

    const view: TreeViewFake = { visible: true, onDidChangeVisibility: vi.fn(disposableFake), dispose: vi.fn() };

    editor.createTreeView.mockImplementation(() => {
      calls.push('createTreeView');

      return view;
    });
    editor.registerCommand.mockImplementation((name, callback) => {
      commands.set(name, callback);

      return disposableFake();
    });
    editor.executeCommand.mockImplementation(async (command, key, value) => {
      calls.push(`${command}:${key}:${String(value)}`);

      return Promise.resolve();
    });
    editor.onDidChangeConfiguration.mockImplementation(disposableFake);
  });

  describe('GIVEN an empty workspaceState', () => {
    it('WHEN the tree registers THEN scopes are set hidden, and the key false, before the view is created', () => {
      registerWith();

      expect(calls).toStrictEqual(['setScopeShown:false', `setContext:${SCOPE_KEY}:false`, 'createTreeView']);
    });
  });

  describe('GIVEN a stored scopeShown of true', () => {
    it('WHEN the tree registers THEN scopes are set shown, and the key true, before the view is created', () => {
      stored.set(SCOPE_KEY, true);

      registerWith();

      expect(calls).toStrictEqual(['setScopeShown:true', `setContext:${SCOPE_KEY}:true`, 'createTreeView']);
    });
  });

  describe('GIVEN a registered tree with scopes hidden', () => {
    beforeEach(() => {
      registerWith();
      calls.length = 0;
    });

    it('WHEN showScope runs THEN it stores true, sets the key, then shows scopes once', async () => {
      await invoke('turboConsole.showScope');

      expect(calls).toStrictEqual(['update:true', `setContext:${SCOPE_KEY}:true`, 'setScopeShown:true']);
      expect(stored.get(SCOPE_KEY)).toBe(true);
    });

    it('WHEN hideScope runs THEN it stores false, sets the key, then hides scopes once', async () => {
      await invoke('turboConsole.hideScope');

      expect(calls).toStrictEqual(['update:false', `setContext:${SCOPE_KEY}:false`, 'setScopeShown:false']);
      expect(stored.get(SCOPE_KEY)).toBe(false);
    });
  });
});
