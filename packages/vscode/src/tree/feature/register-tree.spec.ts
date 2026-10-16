import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Disposable } from 'vscode';

import { registerTree } from './register-tree.ts';
import type { Session } from '../../roots/common/coordinator.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import type { Output } from '../../shared/common/output.type.ts';
import { scriptsToggleMock } from '../../shared/test/mocks/scripts-toggle.mock.ts';
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

/** One macrotask: every spy reached before it has run to its first await. */
const flush = async (): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
};

type Gate = {
  readonly promise: Promise<void>;
  readonly open: () => void;
};

const gateOf = (): Gate => {
  let open: () => void = () => undefined;
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  const gate: Gate = { promise, open };

  return gate;
};

const firstOrderOf = (spy: Mock): number => spy.mock.invocationCallOrder.at(0) ?? Number.POSITIVE_INFINITY;

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
  let disposed: string[];
  let updateGates: Promise<void>[];
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
    disposed = [];
    updateGates = [];
    stored = new Map();
    commands = new Map();
    tree = packagesTreeApiMock();
    vi.mocked(tree.setScopeShown).mockImplementation((value) => {
      calls.push(`setScopeShown:${String(value)}`);
    });

    const workspaceState: ScopeStore = {
      get: (key) => stored.get(key),
      update: async (key, value) => {
        await updateGates.shift();
        await flush();
        calls.push(`update:${String(value)}`);
        stored.set(key, value);
      }
    };

    context = { subscriptions: [], workspaceState, scripts: scriptsToggleMock() };
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

      const registration: Disposable = {
        dispose: () => {
          disposed.push(name);
        }
      };

      return registration;
    });
    editor.executeCommand.mockImplementation(async (command, key, value) => {
      await Promise.resolve();
      calls.push(`${command}:${key}:${String(value)}`);
    });
    editor.onDidChangeConfiguration.mockImplementation(disposableFake);
  });

  describe.each([
    { given: 'an empty workspaceState', stored: undefined, expected: false },
    { given: 'a stored scopeShown of false', stored: false, expected: false },
    { given: 'a stored scopeShown of true', stored: true, expected: true }
  ])('GIVEN $given', ({ stored: value, expected }) => {
    beforeEach(() => {
      if (value !== undefined) stored.set(SCOPE_KEY, value);

      registerWith();
    });

    it('WHEN the tree registers THEN the tree gets the choice before the view is created', () => {
      expect(calls.slice(0, 2)).toStrictEqual([`setScopeShown:${String(expected)}`, 'createTreeView']);
    });

    it('WHEN the tree registers THEN the key is sent before the view is created', () => {
      expect(editor.executeCommand).toHaveBeenCalledWith('setContext', SCOPE_KEY, expected);
      expect(firstOrderOf(editor.executeCommand)).toBeLessThan(firstOrderOf(editor.createTreeView));
    });
  });

  describe('GIVEN the editor rejects the startup key', () => {
    it('WHEN the tree registers THEN the failure is logged', async () => {
      editor.executeCommand.mockRejectedValueOnce(new Error('boom'));

      registerWith();

      await vi.waitFor(() => {
        expect(output.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
      });
    });
  });

  describe('GIVEN a registered tree', () => {
    it('WHEN the subscriptions are disposed THEN both scope commands are unregistered', () => {
      registerWith();

      for (const subscription of context.subscriptions) subscription.dispose();

      expect(disposed).toStrictEqual(expect.arrayContaining(['turboConsole.showScope', 'turboConsole.hideScope']));
    });
  });

  describe('GIVEN a registered tree with scopes hidden', () => {
    beforeEach(async () => {
      registerWith();
      await flush();
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

    it('WHEN the key cannot be set THEN the value stays stored, the tree is unchanged and the command rejects', async () => {
      editor.executeCommand.mockRejectedValueOnce(new Error('refused'));

      await expect(invoke('turboConsole.showScope')).rejects.toThrow('refused');

      expect(stored.get(SCOPE_KEY)).toBe(true);
      expect(calls).toStrictEqual(['update:true']);
    });

    it('WHEN a toggle fails THEN the failure is logged and the command still rejects', async () => {
      editor.executeCommand.mockRejectedValueOnce(new Error('refused'));

      await expect(invoke('turboConsole.showScope')).rejects.toThrow('refused');

      expect(output.error).toHaveBeenCalledWith(expect.stringContaining('refused'));
    });

    it('WHEN showScope fails THEN the next command still runs', async () => {
      editor.executeCommand.mockRejectedValueOnce(new Error('refused'));

      await expect(invoke('turboConsole.showScope')).rejects.toThrow('refused');
      await invoke('turboConsole.hideScope');

      expect(stored.get(SCOPE_KEY)).toBe(false);
      expect(calls.at(-1)).toBe('setScopeShown:false');
    });

    it('WHEN showScope is still storing and hideScope is invoked THEN the last command decides the final state', async () => {
      const firstStore = gateOf();
      const settledKeys = (): string[] => calls.filter((call) => call.startsWith('setContext'));

      updateGates.push(firstStore.promise);

      const showing = invoke('turboConsole.showScope');
      const hiding = invoke('turboConsole.hideScope');

      await flush();
      await flush();
      firstStore.open();
      await Promise.all([showing, hiding]);

      expect(stored.get(SCOPE_KEY)).toBe(false);
      expect(settledKeys().at(-1)).toBe(`setContext:${SCOPE_KEY}:false`);
      expect(calls.at(-1)).toBe('setScopeShown:false');
    });
  });
});
