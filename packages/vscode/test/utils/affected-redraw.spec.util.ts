import * as vscode from 'vscode';

import { packageNodeNamed } from './tree-walk.spec.util.ts';
import type { AffectedScene } from '../common/affected.type.ts';

const SHOW_LIST_COMMAND = 'turboConsole.showList';

const SHOW_FOLDERS_COMMAND = 'turboConsole.showFolders';

/** Asks for the children of the three edited packages, as the view does when they expand. */
export const expandEdited = async (scene: AffectedScene): Promise<void> => {
  const { api, edits } = scene;

  for (const pkg of [edits.readme, edits.leaf, edits.atomDependency]) {
    const node = await packageNodeNamed(api, pkg.name);

    await api.tree.getChildren(node);
  }
};

/** Flips the tree to the list and back to folders; each flip redraws the root. */
export const flipTreeMode = async (): Promise<void> => {
  await vscode.commands.executeCommand(SHOW_LIST_COMMAND);
  await vscode.commands.executeCommand(SHOW_FOLDERS_COMMAND);
};
