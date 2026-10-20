import assert from 'node:assert/strict';

import * as vscode from 'vscode';

import { step } from './suite-env.spec.util.ts';
import { packageNodes, tooltipLinesOf } from './tree-polish-tree.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import { CONTINUOUS_KIND_LINES } from '../../src/tree/common/task-text.const.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import { PERSISTENT_ROOT_ID, ROOT_PACKAGE, SINGLE_APP_NAME, SINGLE_TASK_IDS } from '../common/single-package.const.ts';

const isTask = (node: TreeNode): boolean => node.kind === 'task';

const keyOf = (node: TreeNode): string => node.key;

/** Builds the predicate "this task row's tooltip says the task is continuous". */
const showsContinuous = (api: TurboConsoleApi): ((node: TreeNode) => boolean) => {
  const isContinuous = (node: TreeNode): boolean => {
    const lines = tooltipLinesOf(api.tree.getTreeItem(node));

    return CONTINUOUS_KIND_LINES.every((line) => lines.includes(line));
  };

  return isContinuous;
};

/**
 * L11-1 (spec §2.1, §2.4): the single-package root shows as one package row, `single-app` at `.`, and its children are
 * the five task rows keyed `//#<name>`, only `//#dev` marked continuous. `format` has no `turbo.json` key, so its row
 * here proves a script is a turbo task.
 */
export const rowAndTasksCase = async (api: TurboConsoleApi): Promise<void> => {
  await step('L11-1: one single-app package row at ., five task rows, only dev continuous', async () => {
    const packages = await packageNodes(api);
    const [pkg] = packages;

    assert.deepEqual(packages.map(keyOf), [ROOT_PACKAGE]);

    if (pkg === undefined) throw new Error('the tree holds no package row');

    const item = api.tree.getTreeItem(pkg);
    const children = await api.tree.getChildren(pkg);
    const continuous = children.filter(showsContinuous(api));

    assert.equal(item.label, SINGLE_APP_NAME);
    assert.equal(item.description, '.');
    assert.ok(tooltipLinesOf(item).includes('Path: .'));
    assert.ok(children.every(isTask));
    assert.deepEqual(children.map(keyOf).sort(), SINGLE_TASK_IDS);
    assert.deepEqual(continuous.map(keyOf), [PERSISTENT_ROOT_ID]);
  });
};

/**
 * L11-6 (spec 2026-10-20 theme icons): L11 opens with `turboConsole.icons: theme` already set, so the activation read
 * alone puts the theme folder on the `//` row, over the root itself.
 */
export const themeIconCase = async (api: TurboConsoleApi, root: string): Promise<void> => {
  await step('L11-6: with theme icons preset, the // row takes the theme folder over the root', async () => {
    const [pkg] = await packageNodes(api);

    if (pkg === undefined) throw new Error('the tree holds no package row');

    const item = api.tree.getTreeItem(pkg);
    const icon = item.iconPath;

    assert.ok(icon instanceof vscode.ThemeIcon, 'the // row has no ThemeIcon');
    assert.equal(icon.id, 'folder');
    assert.equal(item.resourceUri?.fsPath, root);
  });
};
