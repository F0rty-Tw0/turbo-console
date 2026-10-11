import * as vscode from 'vscode';

const EXTENSION_ID = 'turbo-console-dev.turbo-console';

export const run = async (): Promise<void> => {
  const extension = vscode.extensions.getExtension(EXTENSION_ID);

  if (extension === undefined) throw new Error(`${EXTENSION_ID} is not installed`);

  await extension.activate();

  if (!extension.isActive) throw new Error(`${EXTENSION_ID} did not activate`);
};
