import assert from 'node:assert/strict';
import { join } from 'node:path';

import * as vscode from 'vscode';

import { lastPackageState, packageStates } from './details-posted.spec.util.ts';
import { step, waitFor } from './suite-env.spec.util.ts';
import { packageNodes, packageRows } from './tree-polish-tree.spec.util.ts';
import { packageNodeNamed } from './tree-walk.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeMode } from '../../src/tree/common/tree-row.type.ts';
import { ADHOC_TASK_ID, DUP_PACKAGE, EMPTY_PACKAGE, POLISH_PACKAGE } from '../common/tree-polish.const.ts';
import type { PackageRowFacts } from '../common/tree-polish.type.ts';

const SCOPE_PREFIX = /^@[^/]+\//u;

/** The packages whose bare name collides keep their scope while scopes are hidden. */
const COLLIDING_NAMES: ReadonlySet<string> = new Set([POLISH_PACKAGE, DUP_PACKAGE]);

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

/** Case 3 (spec 1c-b §6.5): with scripts hidden, a script no turbo.json names has no Scripts group and no row; running one is L10's. */
export const scriptRowCase = async (api: TurboConsoleApi): Promise<void> => {
  await step('L9-3: with scripts hidden, a script no turbo.json names has no row', async () => {
    const pkg = await packageNodeNamed(api, POLISH_PACKAGE);
    const children = await api.tree.getChildren(pkg);
    const kinds = children.map((child) => child.kind);
    const keys = children.map((child) => child.key);

    assert.equal(api.tree.isScriptsShown(), false);
    assert.ok(!kinds.includes('scripts'), `${POLISH_PACKAGE} shows a scripts group`);
    assert.ok(!keys.includes(ADHOC_TASK_ID), `${POLISH_PACKAGE} shows ${ADHOC_TASK_ID}`);
  });
};
