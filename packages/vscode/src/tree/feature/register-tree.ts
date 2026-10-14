import * as vscode from 'vscode';

import type { Session } from '../../roots/common/coordinator.type.ts';
import type { Output } from '../../shared/common/output.type.ts';
import type { SettingLevel } from '../common/setting.type.ts';
import type { PackagesTreeApi } from '../common/tree-node.type.ts';
import type { TreeMode } from '../common/tree-row.type.ts';
import { settingLevelOf } from '../utils/setting-level.util.ts';
import { treeModeOf } from '../utils/tree-mode.util.ts';

const SECTION = 'turboConsole';

/** The `turboConsole.treeMode` setting now. */
export const currentTreeMode = (): TreeMode => {
  const settings = vscode.workspace.getConfiguration(SECTION);
  const value = settings.get<unknown>('treeMode');

  return treeModeOf(value);
};

const configurationTargetOf = (level: SettingLevel): vscode.ConfigurationTarget => {
  switch (level) {
    case 'workspaceFolder':
      return vscode.ConfigurationTarget.WorkspaceFolder;
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
 * The Packages view (spec §4.3, §4.7): the tree view with native Collapse All, store changes into tree refreshes,
 * visibility into the roots' `show`, the title commands and the settings listener. Starts no load itself.
 */
export const registerTree = (context: vscode.ExtensionContext, session: Session, tree: PackagesTreeApi, output: Output): void => {
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
  context.subscriptions.push(view, { dispose: unsubscribe }, visibility, refresh, showFolders, showList, showOutput, settings);
};
