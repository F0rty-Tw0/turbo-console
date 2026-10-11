import * as vscode from 'vscode';

export const activate = (context: vscode.ExtensionContext): void => {
  // M1 registers the extension's commands here.
  context.subscriptions.push(vscode.Disposable.from());
};
