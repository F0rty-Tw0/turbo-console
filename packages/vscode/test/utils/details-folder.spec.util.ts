import assert from 'node:assert/strict';

import * as vscode from 'vscode';

import { openFromRow } from './details-cases.spec.util.ts';
import { rootAt, step, waitFor } from './suite-env.spec.util.ts';
import type { DetailsScene } from '../common/details.type.ts';

/**
 * `panels.pruneRoots()` runs in `onRoots`: removing a workspace folder closes the panels of its root and no other.
 * Opens a panel in root `b` (folder 1 of `two-roots`), removes `b`, and expects only the panel of root `a` to stay.
 */
export const prunedCase = async (scene: DetailsScene): Promise<void> => {
  const { api, root, packageName } = scene;

  await step('L8-5: removing a workspace folder closes its panel and keeps the other', async () => {
    const other = rootAt(1);
    const folders = vscode.workspace.workspaceFolders ?? [];
    const index = folders.findIndex((folder) => folder.uri.fsPath === other);

    assert.notEqual(index, -1, `${other} is not a workspace folder`);
    await openFromRow(other, packageName);

    const opened = api.details.panels().map((panel) => panel.root);

    assert.ok(opened.includes(other), 'the panel of the second root is not listed');
    assert.ok(vscode.workspace.updateWorkspaceFolders(index, 1), 'the second folder was not removed');
    await waitFor('panel of the removed root closed', () => api.details.panels().every((panel) => panel.root !== other));

    const left = api.details.panels().map((panel) => panel.root);

    assert.deepEqual(left, [root]);
  });
};
