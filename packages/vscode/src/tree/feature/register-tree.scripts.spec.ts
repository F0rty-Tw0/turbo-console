import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Disposable } from 'vscode';

import { PackagesTreeProvider } from './packages-provider.ts';
import { registerTree } from './register-tree.ts';
import type { Session } from '../../roots/common/coordinator.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import type { Output } from '../../shared/common/output.type.ts';
import type { ToggleStore } from '../../shared/common/scripts-toggle.type.ts';
import { ScriptsToggle } from '../../shared/domain-logic/scripts-toggle.ts';
import type { ScriptsToggleFake } from '../../shared/test/common/scripts-toggle-fake.type.ts';
import { scriptsToggleMock } from '../../shared/test/mocks/scripts-toggle.mock.ts';
import type { ScopeStore, TreeContext } from '../common/tree-context.type.ts';
import { providerDepsOf } from '../test/utils/provider-deps.spec.util.ts';

type CommandCallback = () => unknown;

/** Every value the provider's event emitter fired, in order. */
const fired = vi.hoisted((): unknown[] => []);

const disposableFake = (): Disposable => {
  const disposable: Disposable = { dispose: vi.fn() };

  return disposable;
};

/** `vscode` exists only inside the editor, so the module is replaced here by the calls the tree and its provider make. */
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
  class EventEmitter {
    public readonly event = vi.fn();
    public readonly fire = vi.fn((value: unknown): void => {
      fired.push(value);
    });

    public readonly dispose = vi.fn();
  }
  const window = { createTreeView: editor.createTreeView };
  const commands = { registerCommand: editor.registerCommand, executeCommand: editor.executeCommand };
  const workspace = { onDidChangeConfiguration: editor.onDidChangeConfiguration };
  const collapsibleStates = { None: 0, Collapsed: 1, Expanded: 2 };
  const module = { window, commands, workspace, EventEmitter, TreeItemCollapsibleState: collapsibleStates };

  return module;
});

describe('FEATURE: registerTree scripts toggle', () => {
  let commands: Map<string, CommandCallback>;
  let disposed: string[];
  let scripts: ScriptsToggleFake;
  let provider: PackagesTreeProvider;
  let context: TreeContext;
  let session: Session;
  let output: Output;

  const invoke = async (name: string): Promise<void> => {
    await commands.get(name)?.();
  };

  const registerWith = (): void => {
    registerTree(context, session, provider, output);
  };

  const buildProvider = (toggle: TreeContext['scripts']): void => {
    const deps = providerDepsOf(undefined, toggle);
    const workspaceState: ScopeStore = { get: (): unknown => undefined, update: async (): Promise<void> => Promise.resolve() };

    provider = new PackagesTreeProvider(session.store, 'list', 'builtin', deps);
    context = { subscriptions: [], workspaceState, scripts: toggle };
  };

  beforeEach(() => {
    commands = new Map();
    disposed = [];
    fired.length = 0;
    scripts = scriptsToggleMock();
    session = {
      store: new RootStore(),
      setWorkspaceFolders: vi.fn(async () => Promise.resolve([])),
      setVisible: vi.fn(),
      setPanelVisible: vi.fn(),
      request: vi.fn(),
      changed: vi.fn()
    };
    output = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), show: vi.fn(), dispose: vi.fn() };

    editor.createTreeView.mockReset();
    editor.registerCommand.mockReset();
    editor.executeCommand.mockReset();
    editor.onDidChangeConfiguration.mockReset();
    editor.createTreeView.mockReturnValue({ visible: true, onDidChangeVisibility: vi.fn(disposableFake), dispose: vi.fn() });
    editor.registerCommand.mockImplementation((name, callback) => {
      commands.set(name, callback);

      const registration: Disposable = {
        dispose: () => {
          disposed.push(name);
        }
      };

      return registration;
    });
    editor.executeCommand.mockResolvedValue(undefined);
    editor.onDidChangeConfiguration.mockImplementation(disposableFake);
    buildProvider(scripts);
  });

  describe('GIVEN a registered tree', () => {
    beforeEach(() => {
      registerWith();
      fired.length = 0;
    });

    it('WHEN it registers THEN both scripts commands exist', () => {
      const names = Array.from(commands.keys());

      expect(names).toStrictEqual(expect.arrayContaining(['turboConsole.showScripts', 'turboConsole.hideScripts']));
    });

    it('WHEN showScripts runs THEN the toggle is set to true', async () => {
      await invoke('turboConsole.showScripts');

      expect(scripts.set.mock.calls).toStrictEqual([[true]]);
    });

    it('WHEN hideScripts runs THEN the toggle is set to false', async () => {
      await invoke('turboConsole.hideScripts');

      expect(scripts.set.mock.calls).toStrictEqual([[false]]);
    });

    it('WHEN showScripts runs THEN the tree redraws once', async () => {
      await invoke('turboConsole.showScripts');

      expect(fired).toStrictEqual([undefined]);
    });

    it('WHEN the toggle is set THEN the tree reads it through isScriptsShown', async () => {
      await invoke('turboConsole.showScripts');

      expect(provider.isScriptsShown()).toBe(true);
    });

    it('WHEN the subscriptions are disposed THEN both scripts commands are unregistered', () => {
      for (const subscription of context.subscriptions) subscription.dispose();

      expect(disposed).toStrictEqual(expect.arrayContaining(['turboConsole.showScripts', 'turboConsole.hideScripts']));
    });

    it('WHEN the provider is disposed THEN a toggle no longer redraws it', async () => {
      provider.dispose();
      await invoke('turboConsole.showScripts');

      expect(fired).toStrictEqual([]);
    });
  });

  describe('GIVEN a stored scriptsShown of true', () => {
    it('WHEN the first getChildren runs THEN the context key was sent before it', async () => {
      const setKey: Mock<(value: boolean) => Promise<void>> = vi.fn(async () => Promise.resolve());
      const store: ToggleStore = { get: (): unknown => true, update: async (): Promise<void> => Promise.resolve() };
      const toggle = new ScriptsToggle({ store, setKey, log: output.error });

      buildProvider(toggle);

      const children = vi.spyOn(provider, 'getChildren');

      registerWith();
      await provider.getChildren();

      expect(setKey.mock.calls).toStrictEqual([[true]]);
      expect(setKey.mock.invocationCallOrder[0]).toBeLessThan(children.mock.invocationCallOrder[0] ?? 0);
    });
  });
});
