import assert from 'node:assert/strict';
import { join } from 'node:path';

import type { PackageDetails, TaskCard } from '@turbo-console/webview-ui';
import * as vscode from 'vscode';

import { lastPackageState, packageStates } from './details-posted.spec.util.ts';
import { lensCountOf, lensTitlesOf } from './scripts-lens.spec.util.ts';
import { step, waitFor } from './suite-env.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import { OPEN_COMMAND } from '../common/details.const.ts';
import { ROOT_PACKAGE, SINGLE_APP_NAME, SINGLE_TASK_IDS } from '../common/single-package.const.ts';

const isUnresolved = (card: TaskCard): boolean => card.definition === null || card.cacheStatus === null;

const idOf = (card: TaskCard): string => card.taskId;

const manifestOf = (root: string): string => join(root, 'package.json');

/** The heading facts and the four turbo task cards of the root package (scripts hidden), every card with its definition and cache status, and no task graph. */
const assertDetailsState = (state: PackageDetails): void => {
  const cardIds = state.tasks.map(idOf).sort();
  const unresolved = state.tasks.filter(isUnresolved).map(idOf);

  assert.equal(state.packageName, ROOT_PACKAGE);
  assert.equal(state.label, SINGLE_APP_NAME);
  assert.equal(state.path, '.');
  assert.equal(state.dryRun, 'ready');
  assert.equal(state.taskGraph, false);
  assert.deepEqual(cardIds, SINGLE_TASK_IDS);
  assert.deepEqual(unresolved, []);
};

/** The tab title, since the heading text itself is not reachable from the extension host. */
const assertDetailsTab = (): void => {
  const tabs = vscode.window.tabGroups.all.flatMap((group) => group.tabs);
  const webviewTabs = tabs.filter((tab) => tab.input instanceof vscode.TabInputWebview);
  const labels = webviewTabs.map((tab) => tab.label);

  assert.ok(labels.includes(`Package Details: ${SINGLE_APP_NAME}`), `tabs: ${labels.join(', ')}`);
};

/**
 * L11-3 (spec §2.3): with the root `package.json` in the editor, the title command (no argument) opens the root
 * package's panel. `PackageDetails.label` is what the heading renders; its render is the webview's own spec.
 */
export const detailsCase = async (api: TurboConsoleApi, root: string): Promise<void> => {
  await step('L11-3: the root package.json opens the // panel headed single-app', async () => {
    await vscode.window.showTextDocument(vscode.Uri.file(manifestOf(root)));
    await vscode.commands.executeCommand(OPEN_COMMAND);
    await waitFor('first package state', () => packageStates(api, root, ROOT_PACKAGE).length > 0);
    await api.details.whenIdle(root, ROOT_PACKAGE);
    assertDetailsState(lastPackageState(api, root, ROOT_PACKAGE));
    assertDetailsTab();
  });
};

/** L11-4 (spec §2.4): the root `package.json` holds one Tasks lens counting the four turbo tasks (scripts hidden), `build` among them. */
export const lensCase = async (root: string): Promise<void> => {
  await step('L11-4: the root package.json holds one Tasks lens of four', async () => {
    const titles = await lensTitlesOf(manifestOf(root));
    const [title] = titles;

    assert.equal(titles.length, 1);

    if (title === undefined) throw new Error('the root package.json has no Tasks lens');

    assert.equal(lensCountOf(title), SINGLE_TASK_IDS.length);
    assert.ok(title.includes('build'), title);
  });
};
