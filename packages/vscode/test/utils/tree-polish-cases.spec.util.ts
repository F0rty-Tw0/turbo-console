import assert from 'node:assert/strict';
import { join } from 'node:path';

import * as vscode from 'vscode';

import { lastPackageState, packageStates } from './details-posted.spec.util.ts';
import { taskNodeNamed } from './run-wait.spec.util.ts';
import { sleep, step, waitFor } from './suite-env.spec.util.ts';
import { packageNodes, packageRows, tooltipLinesOf } from './tree-polish-tree.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeMode } from '../../src/tree/common/tree-row.type.ts';
import { ADHOC_TASK_ID, DUP_PACKAGE, EMPTY_PACKAGE, NOT_TURBO_LINE, POLISH_PACKAGE } from '../common/tree-polish.const.ts';
import type { PackageRowFacts } from '../common/tree-polish.type.ts';

const SCOPE_PREFIX = /^@[^/]+\//u;

/** The packages whose bare name collides keep their scope while scopes are hidden. */
const COLLIDING_NAMES: ReadonlySet<string> = new Set([POLISH_PACKAGE, DUP_PACKAGE]);

/** Spec 1c-a §6.4 case 3: no VS Code task starts within this. */
const NO_TASK_WINDOW_MS = 2000;

const fullNameOf = (name: string): string => name;

const hiddenLabelOf = (name: string): string => {
  const isColliding = COLLIDING_NAMES.has(name);

  if (isColliding) return name;

  return name.replace(SCOPE_PREFIX, '');
};

const labelPairs = (rows: PackageRowFacts[]): string[][] => rows.map((row) => [row.name, row.label]);

const expectedPairs = (rows: PackageRowFacts[], labelFor: (name: string) => string): string[][] =>
  rows.map((row) => [row.name, labelFor(row.name)]);

const namesOf = (rows: PackageRowFacts[]): string[] => rows.map((row) => row.name);

const idsOf = (rows: PackageRowFacts[]): string[] => rows.map((row) => row.id);

const tooltipNamesOf = (rows: PackageRowFacts[]): string[] => rows.map((row) => row.tooltipName);

const keysIn = async (api: TurboConsoleApi, mode: TreeMode): Promise<string[]> => {
  api.tree.setMode(mode);

  const nodes = await packageNodes(api);

  return nodes.map((node) => node.key);
};

/** Case 1: a package with no script has no row in either mode, and its page lists no card. */
export const emptyPackageCase = async (api: TurboConsoleApi, root: string): Promise<void> => {
  await step('L9-1: a package with no script has no row in either tree mode', async () => {
    const folders = await keysIn(api, 'folders');
    const list = await keysIn(api, 'list');

    for (const keys of [folders, list]) {
      assert.ok(keys.includes(POLISH_PACKAGE), `the tree lists ${POLISH_PACKAGE}`);
      assert.ok(!keys.includes(EMPTY_PACKAGE), `the tree lists ${EMPTY_PACKAGE}`);
    }

    api.tree.setMode('folders');
  });
  await step('L9-1: Package Details opened on its package.json holds no task card', async () => {
    const file = vscode.Uri.file(join(root, 'packages', 'zz-empty', 'package.json'));

    await vscode.window.showTextDocument(file);
    await vscode.commands.executeCommand('turboConsole.openPackageDetails');
    await waitFor('empty package state', () => packageStates(api, root, EMPTY_PACKAGE).length > 0);
    await api.details.whenIdle(root, EMPTY_PACKAGE);

    const state = lastPackageState(api, root, EMPTY_PACKAGE);

    assert.deepEqual(state.tasks, []);
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });
};

/** Case 2: hidden scopes by default, shown by `showScope`, hidden again by `hideScope`; row ids never change. */
export const scopeToggleCase = async (api: TurboConsoleApi): Promise<void> => {
  await step('L9-2: the scope toggle shows and hides package scopes and keeps the row ids', async () => {
    const bare = await packageRows(api);

    assert.equal(api.tree.isScopeShown(), false);
    assert.ok(namesOf(bare).includes(DUP_PACKAGE), `the tree lists ${DUP_PACKAGE}`);
    assert.deepEqual(labelPairs(bare), expectedPairs(bare, hiddenLabelOf));
    assert.deepEqual(tooltipNamesOf(bare), namesOf(bare));

    await vscode.commands.executeCommand('turboConsole.showScope');

    const shown = await packageRows(api);

    assert.equal(api.tree.isScopeShown(), true);
    assert.deepEqual(labelPairs(shown), expectedPairs(shown, fullNameOf));
    assert.deepEqual(idsOf(shown), idsOf(bare));

    await vscode.commands.executeCommand('turboConsole.hideScope');

    const hidden = await packageRows(api);

    assert.equal(api.tree.isScopeShown(), false);
    assert.deepEqual(labelPairs(hidden), labelPairs(bare));
  });
};

/** Case 3: a script no turbo.json names reads `not a turbo task`, says so in its tooltip, and Run starts nothing. */
export const scriptRowCase = async (api: TurboConsoleApi, root: string): Promise<void> => {
  await step('L9-3: a script no turbo.json names is a turboScript row that Run does not start', async () => {
    const node = await taskNodeNamed(api, POLISH_PACKAGE, ADHOC_TASK_ID);
    const item = api.tree.getTreeItem(node);
    const lines = tooltipLinesOf(item);
    const before = vscode.tasks.taskExecutions.length;

    assert.equal(item.contextValue, 'turboScript');
    assert.equal(item.description, 'not a turbo task');
    assert.equal(lines.at(0), NOT_TURBO_LINE);

    await vscode.commands.executeCommand('turboConsole.runTask', node);
    await sleep(NO_TASK_WINDOW_MS);

    assert.equal(vscode.tasks.taskExecutions.length, before);
    assert.equal(api.runs.get(root, ADHOC_TASK_ID), undefined);
  });
};
