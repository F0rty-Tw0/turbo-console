import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfigurationChangeEvent, Disposable } from 'vscode';

import { watchIcons } from './icons-setting.ts';
import { registerTree } from './register-tree.ts';
import type { Session } from '../../roots/common/coordinator.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import type { Output } from '../../shared/common/output.type.ts';
import { outputMock } from '../../shared/test/mocks/output.mock.ts';
import { scriptsToggleMock } from '../../shared/test/mocks/scripts-toggle.mock.ts';
import type { IconThemeProbe } from '../common/icon-theme.type.ts';
import type { ScopeStore, TreeContext } from '../common/tree-context.type.ts';
import type { PackagesTreeApi } from '../common/tree-node.type.ts';
import { iconThemeProbeMock } from '../test/mocks/icon-theme-probe.mock.ts';
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

/** `watchIcons` has its own spec; here the editor's extension host and icon theme are out of reach. */
vi.mock('./icons-setting.ts', () => {
  const module = { currentIconsSetting: vi.fn(() => 'auto'), watchIcons: vi.fn() };

  return module;
});

const eventFor = (changed: string): ConfigurationChangeEvent => {
  const event: ConfigurationChangeEvent = { affectsConfiguration: (section) => section === changed };

  return event;
};

describe('FEATURE: registerTree settings', () => {
  let tree: PackagesTreeApi;
  let subscriptions: Disposable[];
  let output: Output;
  let iconTheme: IconThemeProbe;

  const changeSetting = (key: string, value: unknown): void => {
    const listener = editor.onDidChangeConfiguration.mock.calls.at(0)?.[0];

    editor.settings.set(key, value);
    listener?.(eventFor(`turboConsole.${key}`));
  };

  beforeEach(() => {
    subscriptions = [];
    iconTheme = iconThemeProbeMock();
    const workspaceState: ScopeStore = { get: (): unknown => undefined, update: async (): Promise<void> => Promise.resolve() };
    const context: TreeContext = { subscriptions, workspaceState, scripts: scriptsToggleMock(), iconTheme };
    const session: Session = {
      store: new RootStore(),
      setWorkspaceFolders: vi.fn(async () => Promise.resolve([])),
      setVisible: vi.fn(),
      setPanelVisible: vi.fn(),
      request: vi.fn(),
      changed: vi.fn()
    };

    output = outputMock();

    vi.mocked(watchIcons).mockClear();
    editor.settings.clear();
    editor.onDidChangeConfiguration.mockReset();
    editor.onDidChangeConfiguration.mockImplementation(disposableFake);
    tree = packagesTreeApiMock();
    registerTree(context, session, tree, output);
  });

  describe('GIVEN a registered tree', () => {
    it('WHEN it is registered THEN the icons are watched with the tree, the subscriptions, the output and the icon theme probe', () => {
      expect(watchIcons).toHaveBeenCalledExactlyOnceWith(tree, subscriptions, output, iconTheme);
    });

    it('WHEN turboConsole.icons changes THEN the settings listener leaves the icons to watchIcons', () => {
      changeSetting('icons', 'theme');

      expect(tree.setIcons).not.toHaveBeenCalled();
    });

    it('WHEN only turboConsole.treeMode changes THEN the icons mode is left alone', () => {
      changeSetting('treeMode', 'list');

      expect(tree.setMode).toHaveBeenCalledExactlyOnceWith('list');
      expect(tree.setIcons).not.toHaveBeenCalled();
    });
  });
});
