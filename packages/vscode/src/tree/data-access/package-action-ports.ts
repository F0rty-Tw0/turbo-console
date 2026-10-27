import * as vscode from 'vscode';

import type { PackageActionPorts, TextSelection } from '../common/package-action.type.ts';

const rangeOf = (selection: TextSelection): vscode.Range => {
  const { start, end } = selection;
  const range = new vscode.Range(start.line, start.character, end.line, end.character);

  return range;
};

/** `showTextDocument` options: the selection is selected and revealed. The API sets no reveal type, so the editor centers it (`revealRangeInCenter`, even inside the viewport; a range near the top stays at the top); no selection leaves the editor's own state. */
const optionsOf = (selection: TextSelection | null): vscode.TextDocumentShowOptions => {
  const options: vscode.TextDocumentShowOptions = {};

  if (selection !== null) options.selection = rangeOf(selection);

  return options;
};

/** The editor effects of the package actions: the text editor (its buffer, so a selection fits unsaved edits), the Explorer's own reveal command and the clipboard. */
export const editorPackageActionPorts = (): PackageActionPorts => {
  const ports: PackageActionPorts = {
    read: async (file) => {
      try {
        const document = await vscode.workspace.openTextDocument(vscode.Uri.file(file));

        return document.getText();
      } catch {
        return null;
      }
    },
    open: async (file, selection) => {
      const options = optionsOf(selection);

      await vscode.window.showTextDocument(vscode.Uri.file(file), options);
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
