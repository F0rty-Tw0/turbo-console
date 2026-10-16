import * as vscode from 'vscode';

import type { Session } from '../../roots/common/coordinator.type.ts';
import type { Output } from '../../shared/common/output.type.ts';
import type { SettingLevel } from '../common/setting.type.ts';
import type { TreeContext } from '../common/tree-context.type.ts';
import type { PackagesTreeApi } from '../common/tree-node.type.ts';
import type { TreeMode } from '../common/tree-row.type.ts';
import type { VisibleView } from '../common/visible-view.type.ts';
import { settingLevelOf } from '../utils/setting-level.util.ts';
import { treeModeOf } from '../utils/tree-mode.util.ts';

const SECTION = 'turboConsole';
const SCOPE_KEY = 'turboConsole.scopeShown';

/** The `turboConsole.treeMode` setting now. */
export const currentTreeMode = (): TreeMode => {
  const settings = vscode.workspace.getConfiguration(SECTION);
  const value = settings.get<unknown>('treeMode');

  return treeModeOf(value);
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

const writeScopeShown = async (context: TreeContext, tree: PackagesTreeApi, value: boolean): Promise<void> => {
  await context.workspaceState.update(SCOPE_KEY, value);
  await vscode.commands.executeCommand('setContext', SCOPE_KEY, value);
  tree.setScopeShown(value);
};

/**
 * The scope toggle (spec §4.8): restores the stored choice into the tree and the context key, then registers the two
 * view-title commands. The key is set at registration, so the title icon never shows the wrong state.
 */
const registerScopeToggle = (context: TreeContext, tree: PackagesTreeApi): vscode.Disposable => {
  const stored = context.workspaceState.get(SCOPE_KEY) === true;

  tree.setScopeShown(stored);
  void vscode.commands.executeCommand('setContext', SCOPE_KEY, stored);

  const showScope = vscode.commands.registerCommand('turboConsole.showScope', async () => writeScopeShown(context, tree, true));
  const hideScope = vscode.commands.registerCommand('turboConsole.hideScope', async () => writeScopeShown(context, tree, false));
  const toggle: vscode.Disposable = {
    dispose: () => {
      showScope.dispose();
      hideScope.dispose();
    }
  };

  return toggle;
};

/**
 * The Packages view (spec §4.3, §4.7): the tree view with native Collapse All, store changes into tree refreshes,
 * visibility into the roots' `show`, the title commands and the settings listener. Starts no load itself. Returns the view, for
 * `TreeVisibility`.
 */
export const registerTree = (context: TreeContext, session: Session, tree: PackagesTreeApi, output: Output): VisibleView => {
  const scope = registerScopeToggle(context, tree);
  const view = vscode.window.createTreeView('turboConsole.tree', { treeDataProvider: tree, showCollapseAll: true });
  const unsubscribe = session.store.onDidChange((change) => {
    tree.refreshFor(change);
  });
  const visibility = view.onDidChangeVisibility((event) => {
    session.setVisible(event.visible);
  });
  const refresh = vscode.commands.registerCommand('turboConsole.refresh', () => {
    session.request('refresh');
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
  context.subscriptions.push(view, { dispose: unsubscribe }, visibility, refresh, showFolders, showList, showOutput, scope, settings);

  return view;
};
