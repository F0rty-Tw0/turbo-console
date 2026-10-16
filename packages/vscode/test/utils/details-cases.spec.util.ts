import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { TaskCard } from '@turbo-console/webview-ui';
import * as vscode from 'vscode';

import { isPanelShown, lastPackageState, lastRunView, packageStates } from './details-posted.spec.util.ts';
import { packageDirOf, setTaskOutputs, writeEdited } from './package-edit.spec.util.ts';
import { endedRun, taskNodeNamed } from './run-wait.spec.util.ts';
import { loadsOf, step, waitFor } from './suite-env.spec.util.ts';
import { manifestTree } from './tree-walk.spec.util.ts';
import { whenLoadedAfter } from './watch-wait.spec.util.ts';
import type { DetailsScene } from '../common/details.type.ts';

const OPEN_COMMAND = 'turboConsole.openPackageDetails';

const OUTPUTS_GLOB = 'zz-details-out/**';

const isUndefinedCard = (card: TaskCard): boolean => card.command !== null && card.definition === null;

/** Opens the panel as a package row's click does. */
export const openFromRow = async (root: string, packageName: string): Promise<void> => {
  const row = { kind: 'pkg', root, packageName };

  await vscode.commands.executeCommand(OPEN_COMMAND, row);
};

/** Spec §4.6 "open, model loaded": one dry run and no load; a second open of the same package reuses its panel. */
export const openCase = async (scene: DetailsScene): Promise<void> => {
  const { api, root, packageName, counter } = scene;

  counter.reset();
  await step('L8-1: opening from a package row spawns one dry run', async () => {
    await openFromRow(root, packageName);
    await api.details.receive(root, packageName, { type: 'ready' });
    await api.details.whenIdle(root, packageName);

    const state = lastPackageState(api, root, packageName);

    assert.equal(counter.count(), 1);
    assert.equal(state.dryRun, 'ready');
  });
  await step('L8-1: opening the same package again keeps one panel', async () => {
    await openFromRow(root, packageName);
    await api.details.whenIdle(root, packageName);

    assert.equal(api.details.panels().length, 1);
    assert.equal(counter.count(), 1);
  });
};

/**
 * The editor title's command (no argument) reveals the same panel. Showing the `package.json` in the same group hides
 * the panel, and showing it again rebuilds its page, so the case waits for a state posted after the reveal.
 */
export const titleCase = async (scene: DetailsScene): Promise<void> => {
  const { api, root, packageName, manifest } = scene;

  await step('L8-2: the editor title command reveals the same panel with every task', async () => {
    const dir = await packageDirOf(root, packageName);
    const manifestUri = vscode.Uri.file(join(dir, 'package.json'));

    await vscode.window.showTextDocument(manifestUri);
    await waitFor('panel hidden', () => !isPanelShown(api, root, packageName));

    const before = packageStates(api, root, packageName).length;

    await vscode.commands.executeCommand(OPEN_COMMAND);
    await waitFor('panel shown', () => isPanelShown(api, root, packageName));
    await waitFor('state after the reveal', () => packageStates(api, root, packageName).length > before);

    const state = lastPackageState(api, root, packageName);
    const shownIds = manifestTree(manifest).tasks[packageName] ?? [];
    const cardIds = state.tasks.map((card) => card.taskId).sort();
    const undefinedCards = state.tasks.filter(isUndefinedCard);
    const undefinedIds = undefinedCards.map((card) => card.taskId);

    assert.equal(api.details.panels().length, 1);
    assert.deepEqual(cardIds, shownIds);
    assert.deepEqual(undefinedIds, []);
  });
};

/** A run started from the panel is the tree's run: it ends passed and the page's last `runState` says so. */
export const runCase = async (scene: DetailsScene): Promise<void> => {
  const { api, root, packageName, taskId } = scene;

  await step('L8-3: a run from the panel ends passed and the page shows it', async () => {
    await api.details.receive(root, packageName, { type: 'run', taskId });

    const node = await taskNodeNamed(api, packageName, taskId);
    const started = api.runs.get(root, node.key);

    assert.equal(node.root, root);

    if (started === undefined) throw new Error(`the panel started no run of ${taskId}`);

    const ended = await endedRun(api, node, started.launchedAt);
    const view = lastRunView(api, root, packageName, taskId);
    const shown = [view.iconId, view.colorVar, view.isRunning];

    assert.equal(ended.state, 'passed');
    assert.deepEqual(shown, ['pass', '--vscode-testing-iconPassed', false]);
  });
};

/**
 * With the tree hidden and the panel shown, a `turbo.json` edit costs one load and one dry run, and the page gets the
 * new `outputs`. The edit stays: the fixture copy is the launch's own.
 */
export const watchedCase = async (scene: DetailsScene): Promise<void> => {
  const { api, root, packageName, taskId, counter } = scene;

  await step('L8-4: with the tree hidden, a turbo.json edit spawns a load and a dry run', async () => {
    await vscode.commands.executeCommand('workbench.view.explorer');
    await waitFor('tree hidden', () => !api.treeVisible());
    assert.ok(isPanelShown(api, root, packageName), 'the panel is still shown');
    counter.reset();

    const file = join(root, 'turbo.json');
    const original = await readFile(file, 'utf8');
    const before = loadsOf(api, root).length;

    await writeEdited(file, original, (turbo) => {
      setTaskOutputs(turbo, 'build', [OUTPUTS_GLOB]);
    });
    const loads = await whenLoadedAfter(api, root, before);

    await api.details.whenIdle(root, packageName);

    const hasGlob = (): boolean => {
      const states = packageStates(api, root, packageName);
      const card = states.at(-1)?.tasks.find((candidate) => candidate.taskId === taskId);

      return card?.definition?.outputs.includes(OUTPUTS_GLOB) === true;
    };

    assert.equal(loads, 1, 'loads since the edit');
    assert.equal(counter.count(), 2);
    await waitFor('state with the new outputs', hasGlob);
  });
};
