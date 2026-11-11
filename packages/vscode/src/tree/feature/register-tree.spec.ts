import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Disposable } from 'vscode';

import { registerTree } from './register-tree.ts';
import type { Session } from '../../roots/common/coordinator.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import type { Output } from '../../shared/common/output.type.ts';
import type { ScriptsToggleFake } from '../../shared/test/common/scripts-toggle-fake.type.ts';
import { outputMock } from '../../shared/test/mocks/output.mock.ts';
import { scriptsToggleMock } from '../../shared/test/mocks/scripts-toggle.mock.ts';
import type { TreeContext } from '../common/tree-context.type.ts';
import type { PackagesTreeApi } from '../common/tree-node.type.ts';
import { iconThemeProbeMock } from '../test/mocks/icon-theme-probe.mock.ts';
import { packagesTreeApiMock } from '../test/mocks/packages-tree-api.mock.ts';

type CommandCallback = () => unknown;

type TreeViewFake = {
  readonly visible: boolean;
  readonly onDidChangeVisibility: Mock<() => Disposable>;
  readonly dispose: Mock<() => void>;
};

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

/** `watchIcons` has its own spec; here the editor's extension host and icon theme are out of reach. */
vi.mock('./icons-setting.ts', () => {
  const module = { currentIconsSetting: vi.fn(() => 'auto'), watchIcons: vi.fn() };

  return module;
});

describe('FEATURE: registerTree scope toggle', () => {
  let calls: string[];
  let disposed: string[];
  let commands: Map<string, CommandCallback>;
  let tree: PackagesTreeApi;
  let scope: ScriptsToggleFake;
  let prediction: ScriptsToggleFake;
  let affected: ScriptsToggleFake;
  let context: TreeContext;
  let session: Session;
  let output: Output;

  const registerWith = (): void => {
    registerTree(context, session, tree, output);
  };

  const invoke = async (name: string): Promise<void> => {
    await commands.get(name)?.();
  };

  const contextWith = (toggle: ScriptsToggleFake): TreeContext => {
    const treeContext: TreeContext = {
      subscriptions: [],
      scope: toggle,
      scripts: scriptsToggleMock(),
      prediction,
      affected,
      iconTheme: iconThemeProbeMock()
    };

    return treeContext;
  };

  beforeEach(() => {
    calls = [];
    disposed = [];
    commands = new Map();
    tree = packagesTreeApiMock();
    vi.mocked(tree.setScopeShown).mockImplementation((value) => {
      calls.push(`setScopeShown:${String(value)}`);
    });

    scope = scriptsToggleMock();
    prediction = scriptsToggleMock();
    affected = scriptsToggleMock();
    context = contextWith(scope);
    session = {
      store: new RootStore(),
      setWorkspaceFolders: vi.fn(async () => Promise.resolve([])),
      setVisible: vi.fn(),
      setPanelVisible: vi.fn(),
      request: vi.fn(),
      changed: vi.fn()
    };
    output = outputMock();

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
    editor.executeCommand.mockResolvedValue(undefined);
    editor.onDidChangeConfiguration.mockImplementation(disposableFake);
  });

  describe.each([[false], [true]])('GIVEN a scope toggle that starts %s', (shown) => {
    beforeEach(() => {
      scope = scriptsToggleMock(shown);
      context = contextWith(scope);
    });

    it('WHEN the tree registers THEN the tree gets the choice before the view is created', () => {
      registerWith();

      expect(calls.slice(0, 2)).toStrictEqual([`setScopeShown:${String(shown)}`, 'createTreeView']);
    });
  });

  describe('GIVEN a registered tree with the affected toggle off', () => {
    beforeEach(() => {
      registerWith();
    });

    it('WHEN showAffected runs THEN affected.set(true) is called once', async () => {
      await invoke('turboConsole.showAffected');

      expect(affected.set).toHaveBeenCalledExactlyOnceWith(true);
    });

    it('WHEN hideAffected runs THEN affected.set(false) is called once', async () => {
      await invoke('turboConsole.hideAffected');

      expect(affected.set).toHaveBeenCalledExactlyOnceWith(false);
    });

    it('WHEN showAffected runs THEN the prediction toggle is not touched', async () => {
      await invoke('turboConsole.showAffected');

      expect(prediction.set).not.toHaveBeenCalled();
    });

    it('WHEN the subscriptions are disposed THEN both affected commands are unregistered', () => {
      for (const subscription of context.subscriptions) subscription.dispose();

      expect(disposed).toStrictEqual(expect.arrayContaining(['turboConsole.showAffected', 'turboConsole.hideAffected']));
    });

    it('WHEN the affected toggle changes THEN the tree redraws once', async () => {
      await affected.set(true);

      expect(tree.loadsToggled).toHaveBeenCalledOnce();
    });

    it('WHEN the prediction toggle changes THEN the tree redraws once and affected is untouched', async () => {
      await prediction.set(true);

      expect(tree.loadsToggled).toHaveBeenCalledOnce();
      expect(affected.set).not.toHaveBeenCalled();
    });

    it('WHEN the subscriptions are disposed THEN a toggle change no longer redraws the tree', async () => {
      for (const subscription of context.subscriptions) subscription.dispose();
      await affected.set(true);

      expect(tree.loadsToggled).not.toHaveBeenCalled();
    });

    it('WHEN the tree registers THEN it does not redraw yet', () => {
      expect(tree.loadsToggled).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a registered tree with the prediction toggle off', () => {
    beforeEach(() => {
      registerWith();
    });

    it('WHEN showPrediction runs THEN prediction.set(true) is called once', async () => {
      await invoke('turboConsole.showPrediction');

      expect(prediction.set).toHaveBeenCalledExactlyOnceWith(true);
    });

    it('WHEN hidePrediction runs THEN prediction.set(false) is called once', async () => {
      await invoke('turboConsole.hidePrediction');

      expect(prediction.set).toHaveBeenCalledExactlyOnceWith(false);
    });

    it('WHEN showPrediction runs THEN the scope toggle is not touched', async () => {
      await invoke('turboConsole.showPrediction');

      expect(scope.set).not.toHaveBeenCalled();
    });

    it('WHEN the subscriptions are disposed THEN both prediction commands are unregistered', () => {
      for (const subscription of context.subscriptions) subscription.dispose();

      expect(disposed).toStrictEqual(expect.arrayContaining(['turboConsole.showPrediction', 'turboConsole.hidePrediction']));
    });

    it('WHEN the tree registers THEN it does not redraw yet (the store was built with the stored value)', () => {
      expect(tree.loadsToggled).not.toHaveBeenCalled();
    });

    it('WHEN the prediction toggle changes THEN the tree redraws once', async () => {
      await prediction.set(true);

      expect(tree.loadsToggled).toHaveBeenCalledOnce();
    });

    it('WHEN the subscriptions are disposed THEN a toggle change no longer redraws the tree', async () => {
      for (const subscription of context.subscriptions) subscription.dispose();
      await prediction.set(true);

      expect(tree.loadsToggled).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a registered tree with scopes shown', () => {
    beforeEach(() => {
      scope = scriptsToggleMock(true);
      context = contextWith(scope);
      registerWith();
    });

    it('WHEN hideScope runs THEN scope.set(false) is called once', async () => {
      await invoke('turboConsole.hideScope');

      expect(scope.set).toHaveBeenCalledExactlyOnceWith(false);
    });
  });

  describe('GIVEN a registered tree with scopes hidden', () => {
    beforeEach(() => {
      registerWith();
      calls.length = 0;
    });

    it('WHEN showScope runs THEN scope.set(true) is called once', async () => {
      await invoke('turboConsole.showScope');

      expect(scope.set).toHaveBeenCalledExactlyOnceWith(true);
    });

    it('WHEN showScope runs THEN nothing else writes the key', async () => {
      await invoke('turboConsole.showScope');

      expect(editor.executeCommand).not.toHaveBeenCalled();
    });

    it('WHEN showScope runs THEN the tree follows the toggle once', async () => {
      await invoke('turboConsole.showScope');

      expect(calls).toStrictEqual(['setScopeShown:true']);
    });

    it('WHEN the scope toggle changes after register THEN the tree follows with the new value', async () => {
      await scope.set(true);

      expect(calls.at(-1)).toBe('setScopeShown:true');
    });

    it('WHEN scope.set rejects THEN the command rejects with it and adds no log', async () => {
      scope.set.mockRejectedValueOnce(new Error('refused'));

      await expect(invoke('turboConsole.showScope')).rejects.toThrow('refused');
      expect(output.error).not.toHaveBeenCalled();
    });

    describe('WHEN the subscriptions are disposed', () => {
      beforeEach(() => {
        for (const subscription of context.subscriptions) subscription.dispose();
      });

      it('THEN both scope commands are unregistered', () => {
        expect(disposed).toStrictEqual(expect.arrayContaining(['turboConsole.showScope', 'turboConsole.hideScope']));
      });

      it('THEN the tree no longer follows the toggle', async () => {
        await scope.set(true);

        expect(calls).toStrictEqual([]);
      });
    });

    describe('WHEN Refresh is invoked', () => {
      beforeEach(async () => {
        await invoke('turboConsole.refresh');
      });

      it('THEN the session is asked for one refresh', () => {
        expect(session.request).toHaveBeenCalledExactlyOnceWith('refresh');
      });

      it('THEN the tree reloads its Atomizer groups once', () => {
        expect(tree.refreshAtoms).toHaveBeenCalledOnce();
      });
    });
  });
});
