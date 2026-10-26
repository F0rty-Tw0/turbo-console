import * as vscode from 'vscode';

import { logTextOf } from '../../shared/utils/log-text.util.ts';
import { HAS_SCRIPTS_KEY } from '../../tree/common/has-scripts.const.ts';
import { trackHasScripts } from '../../tree/domain-logic/has-scripts-key.ts';
import type { Session } from '../common/coordinator.type.ts';
import { rootFoldersOf } from '../utils/root-folders.util.ts';

/**
 * Spec §3 roots and activation: the local workspace folders holding `turbo.json` become the session's roots now and
 * after every folder change, `onRoots` redraws the tree, and the context key `turboConsole.active` says whether any
 * root exists (it shows the views). `turboConsole.hasScripts` says whether any root's model holds a script (it shows the
 * Scripts toggle); it follows every model change and every folder change. A folder change that fails goes to `log`. Spawns nothing.
 */
export const registerRoots = async (
  context: Pick<vscode.ExtensionContext, 'subscriptions'>,
  session: Session,
  onRoots: () => void,
  log: (line: string) => void
): Promise<void> => {
  const logError = (error: unknown): void => {
    log(logTextOf(error));
  };
  const setHasScripts = async (value: boolean): Promise<void> => {
    await vscode.commands.executeCommand('setContext', HAS_SCRIPTS_KEY, value);
  };
  const hasScripts = trackHasScripts(session.store, setHasScripts, log);
  const update = async (): Promise<void> => {
    const open = vscode.workspace.workspaceFolders ?? [];
    const listed = Array.from(open);
    const folders = rootFoldersOf(listed);
    const roots = await session.setWorkspaceFolders(folders);

    hasScripts.refresh();
    onRoots();

    // Not awaited: the round trip to the main thread took 33–46 ms of activation's 50 ms budget (measured under Xvfb).
    const setKey = vscode.commands.executeCommand('setContext', 'turboConsole.active', roots.length > 0);

    setKey.then(undefined, logError);
  };
  const folderChanges = vscode.workspace.onDidChangeWorkspaceFolders(() => {
    update().catch(logError);
  });

  context.subscriptions.push(folderChanges, { dispose: hasScripts.dispose });
  await update();
};
