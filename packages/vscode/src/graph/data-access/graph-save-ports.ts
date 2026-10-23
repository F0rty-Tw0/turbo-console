import * as vscode from 'vscode';

/** The save dialog's title for the graph image. */
const SAVE_TITLE = 'Export Package Graph Image';

/** The save dialog's file filter for the graph image. */
const SAVE_FILTERS: Record<string, string[]> = { 'PNG image': ['png'] };

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
