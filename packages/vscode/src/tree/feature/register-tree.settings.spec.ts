import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfigurationChangeEvent, Disposable } from 'vscode';

import { registerTree } from './register-tree.ts';
import type { Session } from '../../roots/common/coordinator.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import type { Output } from '../../shared/common/output.type.ts';
import { scriptsToggleMock } from '../../shared/test/mocks/scripts-toggle.mock.ts';
import type { ScopeStore, TreeContext } from '../common/tree-context.type.ts';
import type { PackagesTreeApi } from '../common/tree-node.type.ts';
import { packagesTreeApiMock } from '../test/mocks/packages-tree-api.mock.ts';

type SettingsListener = (event: ConfigurationChangeEvent) => void;

const disposableFake = (): Disposable => {
  const disposable: Disposable = { dispose: vi.fn() };

  return disposable;
};

/** `vscode` exists only inside the editor, so the module is replaced here by the calls `register-tree.ts` makes. */
const editor = vi.hoisted(() => {
  const spies = {
    settings: new Map<string, unknown>(),
    onDidChangeConfiguration: vi.fn<(listener: SettingsListener) => Disposable>()
  };

  return spies;
});

vi.mock('vscode', () => {
  const disposable = (): Disposable => {
    const fake: Disposable = { dispose: vi.fn() };

    return fake;
  };
  const view = { visible: true, onDidChangeVisibility: vi.fn(disposable), dispose: vi.fn() };
  const window = { createTreeView: vi.fn(() => view) };
  const commands = { registerCommand: vi.fn(disposable), executeCommand: vi.fn(async () => Promise.resolve()) };
  const section = { get: (key: string): unknown => editor.settings.get(key) };
  const getConfiguration = vi.fn(() => section);
  const workspace = { onDidChangeConfiguration: editor.onDidChangeConfiguration, getConfiguration };
  const module = { window, commands, workspace };

  return module;
});

const eventFor = (changed: string): ConfigurationChangeEvent => {
  const event: ConfigurationChangeEvent = { affectsConfiguration: (section) => section === changed };

  return event;
};

describe('FEATURE: registerTree settings', () => {
  let tree: PackagesTreeApi;

  const changeSetting = (key: string, value: unknown): void => {
    const listener = editor.onDidChangeConfiguration.mock.calls.at(0)?.[0];

    editor.settings.set(key, value);
    listener?.(eventFor(`turboConsole.${key}`));
  };

  beforeEach(() => {
    const workspaceState: ScopeStore = { get: (): unknown => undefined, update: async (): Promise<void> => Promise.resolve() };
    const context: TreeContext = { subscriptions: [], workspaceState, scripts: scriptsToggleMock() };
    const session: Session = {
      store: new RootStore(),
      setWorkspaceFolders: vi.fn(async () => Promise.resolve([])),
      setVisible: vi.fn(),
      setPanelVisible: vi.fn(),
      request: vi.fn(),
      changed: vi.fn()
    };
    const output: Output = { error: vi.fn(), warn: vi.fn(), show: vi.fn(), dispose: vi.fn() };

    editor.settings.clear();
    editor.onDidChangeConfiguration.mockReset();
    editor.onDidChangeConfiguration.mockImplementation(disposableFake);
    tree = packagesTreeApiMock();
    registerTree(context, session, tree, output);
  });

  describe('GIVEN a registered tree', () => {
    it('WHEN turboConsole.icons changes to theme THEN the tree gets the theme mode', () => {
      changeSetting('icons', 'theme');

      expect(tree.setIcons).toHaveBeenCalledExactlyOnceWith('theme');
    });

    it('WHEN turboConsole.icons changes to an unknown value THEN the tree gets the builtin mode', () => {
      changeSetting('icons', 'x');

      expect(tree.setIcons).toHaveBeenCalledExactlyOnceWith('builtin');
    });

    it('WHEN only turboConsole.treeMode changes THEN the icons mode is left alone', () => {
      changeSetting('treeMode', 'list');

      expect(tree.setIcons).not.toHaveBeenCalled();
    });
  });
});
