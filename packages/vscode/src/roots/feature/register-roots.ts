import * as vscode from 'vscode';

import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { Session } from '../common/coordinator.type.ts';
import { rootFoldersOf } from '../utils/root-folders.util.ts';

/**
 * Spec §3 roots and activation: the local workspace folders holding `turbo.json` become the session's roots now and
 * after every folder change, `onRoots` redraws the tree, and the context key `turboConsole.active` says whether any
 * root exists (it shows the views). A folder change that fails goes to `log`. Spawns nothing.
 */
export const registerRoots = async (
  context: vscode.ExtensionContext,
  session: Session,
  onRoots: () => void,
  log: (line: string) => void
): Promise<void> => {
  const update = async (): Promise<void> => {
    const open = vscode.workspace.workspaceFolders ?? [];
    const listed = Array.from(open);
    const folders = rootFoldersOf(listed);
    const roots = await session.setWorkspaceFolders(folders);

    onRoots();
    await vscode.commands.executeCommand('setContext', 'turboConsole.active', roots.length > 0);
  };
  const folderChanges = vscode.workspace.onDidChangeWorkspaceFolders(() => {
    update().catch((error: unknown) => {
      log(logTextOf(error));
    });
  });

  context.subscriptions.push(folderChanges);
  await update();
};
