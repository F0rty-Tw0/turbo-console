import assert from 'node:assert/strict';

import * as vscode from 'vscode';

import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import { assertOnlyMessage, revealLoads } from '../utils/message-tree.spec.util.ts';
import { markDone, rootAt, step, turboApi } from '../utils/suite-env.spec.util.ts';
import { readSuiteEnv } from '../utils/suite-input.spec.util.ts';

/** The top-level root rows of a multi-root window, checked against the workspace folders' keys and names; both expanded. */
const rootNodes = async (api: TurboConsoleApi, roots: string[]): Promise<TreeNode[]> => {
  const nodes = await api.tree.getChildren(undefined);
  const items = nodes.map((node) => api.tree.getTreeItem(node));
  const shown = nodes.map((node, index) => [node.kind, node.key, items[index]?.label, items[index]?.collapsibleState]);
  const [bad, empty] = roots;
  const expanded = vscode.TreeItemCollapsibleState.Expanded;

  assert.deepEqual(shown, [
    ['root', bad, 'bad', expanded],
    ['root', empty, 'empty', expanded]
  ]);

  return nodes;
};

/** L6: a two-folder `.code-workspace`, `bad` with an invalid `turbo.json` and `empty` whose globs match no package. */
export const run = async (): Promise<void> => {
  const env = readSuiteEnv();
  const api = await turboApi();
  const roots = [rootAt(0), rootAt(1)];
  let nodes: TreeNode[] = [];

  await step('reveal the view', async () => revealLoads(api, roots));
  await step('multi-root: one row per root, by folder name', async () => {
    nodes = await rootNodes(api, roots);
  });
  await step('6c: the load-error row alone under bad', async () => assertOnlyMessage(api, nodes.at(0), 'load-no-model'));
  await step('6d: the no-packages row alone under empty', async () => assertOnlyMessage(api, nodes.at(1), 'no-packages'));
  await markDone(env);
};
