import * as vscode from 'vscode';

import type { PackageActionPorts } from '../common/package-action.type.ts';

/** The editor effects of the package actions: the text editor, the Explorer's own reveal command and the clipboard. */
export const editorPackageActionPorts = (): PackageActionPorts => {
  const ports: PackageActionPorts = {
    open: async (file) => {
      await vscode.window.showTextDocument(vscode.Uri.file(file));
    },
    reveal: async (directory) => {
      await vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(directory));
    },
    copy: async (text) => {
      await vscode.env.clipboard.writeText(text);
    }
  };

  return ports;
};
