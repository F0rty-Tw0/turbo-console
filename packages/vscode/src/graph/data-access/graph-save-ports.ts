import * as vscode from 'vscode';

import { SAVE_FILTERS, SAVE_TITLE } from '../common/graph.const.ts';

/** The path the user picked in the save dialog, or `null` when they cancelled. */
export const pickSaveUri = async (defaultPath: string): Promise<string | null> => {
  const defaultUri = vscode.Uri.file(defaultPath);
  const uri = await vscode.window.showSaveDialog({ defaultUri, filters: SAVE_FILTERS, title: SAVE_TITLE });

  return uri?.fsPath ?? null;
};

export const writeBytes = async (path: string, bytes: Uint8Array): Promise<void> => {
  const uri = vscode.Uri.file(path);

  await vscode.workspace.fs.writeFile(uri, bytes);
};

export const showInfo = (text: string): void => {
  void vscode.window.showInformationMessage(text);
};

export const showError = (text: string): void => {
  void vscode.window.showErrorMessage(text);
};
