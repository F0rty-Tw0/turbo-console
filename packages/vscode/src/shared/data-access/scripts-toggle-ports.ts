import * as vscode from 'vscode';

import type { Output } from '../common/output.type.ts';
import { SCRIPTS_KEY } from '../common/scripts-toggle.const.ts';
import type { ScriptsTogglePorts } from '../common/scripts-toggle.type.ts';

/** The scripts toggle's real ports: the window's `workspaceState`, the `setContext` command and the output channel. */
export const editorScriptsTogglePorts = (state: vscode.Memento, output: Output): ScriptsTogglePorts => {
  const setKey = async (value: boolean): Promise<void> => {
    await vscode.commands.executeCommand('setContext', SCRIPTS_KEY, value);
  };
  const ports: ScriptsTogglePorts = { store: state, setKey, log: output.error };

  return ports;
};
