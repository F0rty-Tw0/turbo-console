import * as vscode from 'vscode';

import { tooltipMarkdownOf, tooltipOf } from '../../shared/utils/tooltip.util.ts';
import type { RowCommand, TreeRow } from '../common/tree-row.type.ts';

const COLLAPSIBLE_STATES: Readonly<Record<TreeRow['collapsible'], vscode.TreeItemCollapsibleState>> = {
  none: vscode.TreeItemCollapsibleState.None,
  collapsed: vscode.TreeItemCollapsibleState.Collapsed,
  expanded: vscode.TreeItemCollapsibleState.Expanded
};

const themeColorOf = (color: string | null): vscode.ThemeColor | undefined => {
  if (color === null) return undefined;

  return new vscode.ThemeColor(color);
};

/** `RowCommand` has no title; the row's own label, already clean, names what a click does. */
const commandOf = (command: RowCommand, title: string): vscode.Command => {
  const built: vscode.Command = { command: command.command, title, arguments: command.args };

  return built;
};

/**
 * VS Code reads a plain-string tooltip as the row's aria label, so root, folder and package rows get markdown and keep
 * label and description as theirs. Task rows keep the plain string they had before.
 */
const tooltipFor = (row: TreeRow): string | vscode.MarkdownString => {
  if (row.kind === 'task') return tooltipOf(row.tooltip);

  const markdown = tooltipMarkdownOf(row.tooltip);

  return new vscode.MarkdownString(markdown);
};

/**
 * A row as VS Code's item. Without tooltip lines the tooltip stays unset, so VS Code shows the label on hover (an empty
 * string would show nothing, and a cut-off message label could not be read); otherwise one cleaned line per line.
 */
export const toTreeItem = (row: TreeRow): vscode.TreeItem => {
  const item = new vscode.TreeItem(row.label, COLLAPSIBLE_STATES[row.collapsible]);
  const color = themeColorOf(row.icon.color);
  const tooltip = tooltipFor(row);

  item.id = row.id;
  item.description = row.description;
  item.iconPath = new vscode.ThemeIcon(row.icon.id, color);
  item.contextValue = row.contextValue;

  if (row.tooltip.length > 0) item.tooltip = tooltip;

  if (row.command !== null) item.command = commandOf(row.command, row.label);

  return item;
};
