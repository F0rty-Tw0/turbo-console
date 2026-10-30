import * as vscode from 'vscode';

import { currentIconsSetting, watchIcons } from './icons-setting.ts';
import type { Session } from '../../roots/common/coordinator.type.ts';
import type { Output } from '../../shared/common/output.type.ts';
import type { ScriptsToggleApi } from '../../shared/common/scripts-toggle.type.ts';
import { NO_FILE_NAMES } from '../common/icon-theme.const.ts';
import type { SettingLevel } from '../common/setting.type.ts';
import type { TreeContext } from '../common/tree-context.type.ts';
import type { PackagesTreeApi } from '../common/tree-node.type.ts';
import type { IconsState, TreeMode } from '../common/tree-row.type.ts';
import type { VisibleView } from '../common/visible-view.type.ts';
import { iconModeOf } from '../utils/icons-mode.util.ts';
import { settingLevelOf } from '../utils/setting-level.util.ts';
import { treeModeOf } from '../utils/tree-mode.util.ts';

const SECTION = 'turboConsole';

/** The `turboConsole.treeMode` setting now. */
export const currentTreeMode = (): TreeMode => {
  const settings = vscode.workspace.getConfiguration(SECTION);
  const value = settings.get<unknown>('treeMode');

  return treeModeOf(value);
};

/** The icons state for the first draw: the theme is not known yet, so `auto` is `builtin` and no file names are named until `watchIcons` resolves. */
export const currentIcons = (): IconsState => {
  const mode = iconModeOf(currentIconsSetting(), null);
  const state: IconsState = { mode, fileNames: NO_FILE_NAMES };

  return state;
};

const configurationTargetOf = (level: SettingLevel): vscode.ConfigurationTarget => {
  switch (level) {
    case 'workspace':
      return vscode.ConfigurationTarget.Workspace;
    case 'global':
      return vscode.ConfigurationTarget.Global;
  }
};

/** The view-title toggle writes the level that sets the mode now; the settings listener then switches the tree. */
const writeTreeMode = async (mode: TreeMode): Promise<void> => {
  const settings = vscode.workspace.getConfiguration(SECTION);
  const inspected = settings.inspect('treeMode');
  const level = settingLevelOf(inspected);
  const target = configurationTargetOf(level);

  await settings.update('treeMode', mode, target);
};

const onSettings = (event: vscode.ConfigurationChangeEvent, tree: PackagesTreeApi, session: Session): void => {
  const isModeChanged = event.affectsConfiguration(`${SECTION}.treeMode`);
  const isPathChanged = event.affectsConfiguration(`${SECTION}.turboPath`);

  if (isModeChanged) tree.setMode(currentTreeMode());

  if (isPathChanged) session.request('setting');
};

/**
 * A toggle's two view-title commands (spec §4.8, 1c-b). The toggle already restored the stored choice and sent its context
 * key when it was built, before the view is visible, so the title icon never shows the wrong state; the commands only write
 * through it. A rejected write reaches the caller; the toggle has logged it.
 */
const registerToggle = (toggle: ScriptsToggleApi, showId: string, hideId: string): vscode.Disposable => {
  const show = vscode.commands.registerCommand(showId, async () => toggle.set(true));
  const hide = vscode.commands.registerCommand(hideId, async () => toggle.set(false));
  const registration: vscode.Disposable = {
    dispose: () => {
      show.dispose();
      hide.dispose();
    }
  };

  return registration;
};

/** Gives the tree the scope choice now, so its first draw keeps the stored one, and again on every change of the toggle. */
const followScope = (scope: ScriptsToggleApi, tree: PackagesTreeApi): vscode.Disposable => {
  const follow = (): void => {
    tree.setScopeShown(scope.isShown());
  };

  follow();

  const unsubscribe = scope.onDidChange(follow);
  const following: vscode.Disposable = { dispose: unsubscribe };

  return following;
};

/**
 * The Packages view (spec §4.3, §4.7): the tree view with native Collapse All, store changes into tree refreshes,
 * visibility into the roots' `show`, the title commands and the settings listener. Starts no load itself. Returns the view, for
 * `TreeVisibility`.
 */
export const registerTree = (context: TreeContext, session: Session, tree: PackagesTreeApi, output: Output): VisibleView => {
  const following = followScope(context.scope, tree);
  const scope = registerToggle(context.scope, 'turboConsole.showScope', 'turboConsole.hideScope');
  const scripts = registerToggle(context.scripts, 'turboConsole.showScripts', 'turboConsole.hideScripts');
  const view = vscode.window.createTreeView('turboConsole.tree', { treeDataProvider: tree, showCollapseAll: true });
  const unsubscribe = session.store.onDidChange((change) => {
    tree.refreshFor(change);
  });
  const visibility = view.onDidChangeVisibility((event) => {
    session.setVisible(event.visible);
  });
  const refresh = vscode.commands.registerCommand('turboConsole.refresh', () => {
    session.request('refresh');
    tree.refreshAtoms();
  });
  const showFolders = vscode.commands.registerCommand('turboConsole.showFolders', async () => writeTreeMode('folders'));
  const showList = vscode.commands.registerCommand('turboConsole.showList', async () => writeTreeMode('list'));
  const showOutput = vscode.commands.registerCommand('turboConsole.showOutput', () => {
    output.show();
  });
  const settings = vscode.workspace.onDidChangeConfiguration((event) => {
    onSettings(event, tree, session);
  });

  session.setVisible(view.visible);
  watchIcons(tree, context.subscriptions, output, context.iconTheme);
  context.subscriptions.push(
    view,
    { dispose: unsubscribe },
    visibility,
    refresh,
    showFolders,
    showList,
    showOutput,
    following,
    scope,
    scripts,
    settings
  );

  return view;
};
