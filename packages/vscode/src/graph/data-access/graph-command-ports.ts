import * as vscode from 'vscode';

import type { RootFolder } from '../../roots/common/root.type.ts';
import type { PickItem } from '../../run/common/picker.type.ts';
import type { RootPickPorts } from '../common/graph-panel.type.ts';

const itemOf = (folder: RootFolder): vscode.QuickPickItem => {
  const item: vscode.QuickPickItem = { label: folder.name, description: folder.root };

  return item;
};

const pickRoot = async (folders: RootFolder[]): Promise<string | undefined> => {
  const items = folders.map(itemOf);
  const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Show the package graph of…' });

  return picked?.description;
};

const pickTasks = async (items: PickItem[], placeHolder: string): Promise<string[] | undefined> => {
  const picked = await vscode.window.showQuickPick(items, { canPickMany: true, matchOnDescription: true, placeHolder });

  return picked?.map((item) => item.value);
};

/**
 * The editor effects of the Show Package Graph command: the active manifest (`fileOf` is the run pickers'
 * `manifestFile`), the folder of a file, a folder pick, a multi-pick, an info and an error message, and `log` (the output channel).
 */
export const editorGraphCommandPorts = (
  fileOf: (arg: unknown) => string | null,
  rootOf: RootPickPorts['rootOf'],
  log: RootPickPorts['log']
): RootPickPorts => {
  const ports: RootPickPorts = {
    activeFile: () => fileOf(undefined),
    rootOf,
    pick: pickRoot,
    pickMany: pickTasks,
    info: (text) => {
      void vscode.window.showInformationMessage(text);
    },
    error: (text) => {
      void vscode.window.showErrorMessage(text);
    },
    log
  };

  return ports;
};
