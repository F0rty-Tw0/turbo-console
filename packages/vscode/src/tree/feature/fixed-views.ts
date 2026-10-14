import * as vscode from 'vscode';

import { helpUrlOf } from '../../shared/utils/help-link.util.ts';
import type { FixedItem, FixedViewApi } from '../common/fixed-view.type.ts';

const toFixedTreeItem = (item: FixedItem): vscode.TreeItem => {
  const treeItem = new vscode.TreeItem(item.label, vscode.TreeItemCollapsibleState.None);

  treeItem.id = item.id;
  treeItem.iconPath = new vscode.ThemeIcon(item.icon);
  treeItem.command = { command: item.command.command, title: item.label, arguments: item.command.args };

  return treeItem;
};

/**
 * A view of fixed rows (Common Commands, Help and Feedback, spec §4.6.5 and §4.6.7): a flat list with a codicon and a
 * command per row, no children and no refresh.
 */
export class FixedViewProvider implements vscode.TreeDataProvider<FixedItem>, FixedViewApi {
  private readonly items: FixedItem[];
  public readonly getTreeItem = toFixedTreeItem;

  public constructor(items: FixedItem[]) {
    this.items = items;
  }

  public getChildren(item?: FixedItem): FixedItem[] {
    if (item !== undefined) return [];

    return this.items;
  }
}

/** `turboConsole.openLink` takes a link id; an id with no fixed url, or any other argument, does nothing. */
const openLink = async (id: unknown): Promise<void> => {
  if (typeof id !== 'string') return;

  const url = helpUrlOf(id);

  if (url !== null) await vscode.env.openExternal(vscode.Uri.parse(url));
};

/** Shows the two views and registers the command the Help and Feedback rows run. */
export const registerFixedViews = (commands: FixedViewProvider, help: FixedViewProvider): vscode.Disposable => {
  const commandsView = vscode.window.registerTreeDataProvider('turboConsole.commands', commands);
  const helpView = vscode.window.registerTreeDataProvider('turboConsole.help', help);
  const open = vscode.commands.registerCommand('turboConsole.openLink', openLink);

  return vscode.Disposable.from(commandsView, helpView, open);
};
