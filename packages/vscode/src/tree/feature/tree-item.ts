import { join } from 'node:path';

import * as vscode from 'vscode';

import { tooltipMarkdownOf } from '../../shared/utils/tooltip.util.ts';
import { THEME_ICON_SCHEME } from '../common/icon-theme.const.ts';
import type { IconsState, RowCommand, TreeRow } from '../common/tree-row.type.ts';
import { themeFileNameOf } from '../utils/theme-file-name.util.ts';

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

/** VS Code reads a plain-string tooltip as the row's aria label, so every row gets markdown and keeps label and description as theirs. */
const tooltipFor = (row: TreeRow): vscode.MarkdownString => {
  const markdown = tooltipMarkdownOf(row.tooltip);

  return new vscode.MarkdownString(markdown);
};

/**
 * In theme mode a row with a folder takes the theme's folder icon, and a tool row whose config file the theme names takes
 * that file's icon, both drawn from `resourceUri`; every other row keeps its own codicon.
 */
const applyIcon = (item: vscode.TreeItem, row: TreeRow, icons: IconsState): void => {
  if (icons.mode === 'theme' && row.folder !== undefined) {
    item.iconPath = vscode.ThemeIcon.Folder;
    item.resourceUri = vscode.Uri.file(join(row.root, row.folder));

    return;
  }

  const fileName = themeFileNameOf(row, icons);

  if (fileName !== null) {
    item.iconPath = vscode.ThemeIcon.File;
    item.resourceUri = vscode.Uri.from({ scheme: THEME_ICON_SCHEME, path: `/${fileName}` });

    return;
  }

  const color = themeColorOf(row.icon.color);

  item.iconPath = new vscode.ThemeIcon(row.icon.id, color);
};

/**
 * A row as VS Code's item. Without tooltip lines the tooltip stays unset, so VS Code shows the label on hover (an empty
 * string would show nothing, and a cut-off message label could not be read); otherwise one cleaned line per line.
 */
export const toTreeItem = (row: TreeRow, icons: IconsState): vscode.TreeItem => {
  const item = new vscode.TreeItem(row.label, COLLAPSIBLE_STATES[row.collapsible]);
  const tooltip = tooltipFor(row);

  item.id = row.id;
  item.description = row.description;
  item.contextValue = row.contextValue;

  applyIcon(item, row, icons);

  if (row.tooltip.length > 0) item.tooltip = tooltip;

  if (row.command !== null) item.command = commandOf(row.command, row.label);

  return item;
};
