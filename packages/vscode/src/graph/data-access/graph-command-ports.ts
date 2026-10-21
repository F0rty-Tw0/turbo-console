import * as vscode from 'vscode';

import type { RootFolder } from '../../roots/common/root.type.ts';
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

/**
 * The editor effects of the Show Package Graph command: the active manifest (`fileOf` is the run pickers'
 * `manifestFile`), the folder of a file, a folder pick and an info message.
 */
export const editorGraphCommandPorts = (fileOf: (arg: unknown) => string | null, rootOf: RootPickPorts['rootOf']): RootPickPorts => {
  const ports: RootPickPorts = {
    activeFile: () => fileOf(undefined),
    rootOf,
    pick: pickRoot,
    info: (text) => {
      void vscode.window.showInformationMessage(text);
    }
  };

  return ports;
};
