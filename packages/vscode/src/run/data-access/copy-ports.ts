import * as vscode from 'vscode';

import type { CopyPorts } from '../common/copy.type.ts';

/** The editor effects of Copy Command: the shell the terminal opens with, the clipboard and an information message. */
export const editorCopyPorts = (): CopyPorts => {
  const ports: CopyPorts = {
    shell: () => vscode.env.shell,
    write: async (text) => {
      await vscode.env.clipboard.writeText(text);
    },
    info: (text) => {
      void vscode.window.showInformationMessage(text);
    }
  };

  return ports;
};
