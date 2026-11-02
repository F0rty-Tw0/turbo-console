import * as vscode from 'vscode';

import type { Output } from '../common/output.type.ts';
import type { ScriptsTogglePorts } from '../common/scripts-toggle.type.ts';

/** The toggles' real ports: the window's `workspaceState`, the `setContext` command for the key it is given and the output channel. */
export const editorTogglePorts = (state: vscode.Memento, output: Output): ScriptsTogglePorts => {
  const setKey = async (key: string, value: boolean): Promise<void> => {
    await vscode.commands.executeCommand('setContext', key, value);
  };
  const ports: ScriptsTogglePorts = { store: state, setKey, log: output.error };

  return ports;
};
