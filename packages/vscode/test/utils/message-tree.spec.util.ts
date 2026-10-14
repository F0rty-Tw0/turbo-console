import assert from 'node:assert/strict';

import * as vscode from 'vscode';

import { loadsOf, waitFor } from './suite-env.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import { MESSAGE_ICONS, MESSAGE_TEXTS, SHOW_OUTPUT_COMMAND } from '../../src/tree/common/message.const.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import type { MessageKind } from '../../src/tree/common/tree-row.type.ts';

/**
 * Reveals the Turbo Console container, then waits until each root's first load settled and its loads went idle. For
 * roots that end on a message row, where the "tree visible" span `revealTree` waits for never closes.
 */
export const revealLoads = async (api: TurboConsoleApi, roots: string[]): Promise<void> => {
  await vscode.commands.executeCommand('workbench.view.extension.turboConsole');

  for (const root of roots) {
    const records = loadsOf(api, root);

    await waitFor(`first load of ${root}`, () => records.some((record) => record.outcome !== null));
    await api.whenIdle(root);
  }
};

/**
 * Asserts that the rows under `parent` (the top level when `undefined`) are exactly one `kind` message row with its
 * spec §4.4 text, theme icon and color, the command that opens the Output channel, and no tooltip, so VS Code shows the
 * label on hover.
 */
export const assertOnlyMessage = async (api: TurboConsoleApi, parent: TreeNode | undefined, kind: MessageKind): Promise<void> => {
  const nodes = await api.tree.getChildren(parent);
  const shown = nodes.map((node) => [node.kind, node.key]);

  assert.deepEqual(shown, [['msg', kind]]);

  const node = nodes.at(0);

  if (node === undefined) throw new Error(`no ${kind} row`);

  const item = api.tree.getTreeItem(node);

  assert.equal(item.label, MESSAGE_TEXTS[kind]);
  assert.equal(item.tooltip, undefined);

  const icon = item.iconPath;

  assert.ok(icon instanceof vscode.ThemeIcon, `the ${kind} row has no theme icon`);

  const expected = MESSAGE_ICONS[kind];
  const shownIcon = [icon.id, icon.color?.id ?? null];
  const shownCommand = [item.command?.command, item.command?.arguments];

  assert.deepEqual(shownIcon, [expected.id, expected.color]);
  assert.deepEqual(shownCommand, [SHOW_OUTPUT_COMMAND.command, SHOW_OUTPUT_COMMAND.args]);
};
