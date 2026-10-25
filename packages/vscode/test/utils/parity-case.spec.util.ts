import assert from 'node:assert/strict';
import { join } from 'node:path';

import * as vscode from 'vscode';

import { leafPair } from './parity-affected.spec.util.ts';
import { affectedCase, everywhereCase } from './parity-all.spec.util.ts';
import { buildId, buildStepOf, packagesWith, runPicked, taskNamesOf } from './parity-pick.spec.util.ts';
import { settledRunSince } from './parity-run.spec.util.ts';
import { fixedViewsCase, foldersCase, openSpecRegisteredCase } from './parity-views.spec.util.ts';
import { taskNodeNamed } from './run-wait.spec.util.ts';
import { log, step, waitFor } from './suite-env.spec.util.ts';
import { packageNodeNamed } from './tree-walk.spec.util.ts';
import type { RunEntry } from '../../src/run/common/run.type.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { ShownManifest, ShownPackage, SuiteEnv } from '../common/launch.type.ts';
import { BUILD_TASK } from '../common/parity.const.ts';
import type { ParityScene, PickStep } from '../common/parity.type.ts';

const OPEN_LIMIT_MS = 10_000;

const manifestFileOf = (root: string, pkg: ShownPackage): string => join(root, pkg.path, 'package.json');

/** Drives `command`'s quick picks, then returns the settled run of `pkg`'s `build` that it launched. */
const pickedRun = async (scene: ParityScene, command: string, pkg: ShownPackage, steps: PickStep[]): Promise<RunEntry> => {
  const node = await taskNodeNamed(scene.api, pkg.name, buildId(pkg));
  const since = Date.now();

  await runPicked(command, steps, scene.budgetFactor);

  return settledRunSince(scene.api, node, since);
};

const pickerCase = async (scene: ParityScene): Promise<void> => {
  const { manifest, pair } = scene;

  await step('8: the palette picker runs the picked package task', async () => {
    const packageStep: PickStep = { list: packagesWith(manifest, BUILD_TASK), wanted: pair.leaf.name };
    const entry = await pickedRun(scene, 'turboConsole.runTaskPicker', pair.leaf, [buildStepOf(manifest), packageStep]);

    log(`picker run: ${entry.taskId} ${entry.state}`);
    assert.equal(entry.state, 'passed');
  });
};

const packageJsonCase = async (scene: ParityScene): Promise<void> => {
  const { manifest, pair, root } = scene;

  await step('8: Run Turbo Task… on an open package.json runs the picked task', async () => {
    const file = vscode.Uri.file(manifestFileOf(root, pair.other));
    const taskStep: PickStep = { list: taskNamesOf(manifest, pair.other.name), wanted: BUILD_TASK };

    await vscode.window.showTextDocument(file);

    const entry = await pickedRun(scene, 'turboConsole.runPackageTask', pair.other, [taskStep]);

    log(`package.json run: ${entry.taskId} ${entry.state}`);
    assert.equal(entry.state, 'passed');
  });
};

const openCase = async (scene: ParityScene): Promise<void> => {
  const { api, pair, root } = scene;

  await step('8: Open package.json shows the package manifest', async () => {
    const expected = vscode.Uri.file(manifestFileOf(root, pair.leaf)).fsPath;
    const node = await packageNodeNamed(api, pair.leaf.name);
    const isShown = (): boolean => vscode.window.activeTextEditor?.document.uri.fsPath === expected;

    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await vscode.commands.executeCommand('turboConsole.openPackageJson', node);
    await waitFor(`the editor of ${expected}`, isShown, OPEN_LIMIT_MS * scene.budgetFactor);
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });
};

const copyCase = async (scene: ParityScene): Promise<void> => {
  const { api, pair } = scene;

  await step('8: Copy Command puts turbo run <task> --filter=<package> on the clipboard', async () => {
    const node = await taskNodeNamed(api, pair.leaf.name, buildId(pair.leaf));

    await vscode.env.clipboard.writeText('');
    await vscode.commands.executeCommand('turboConsole.copyCommand', node);

    const copied = await vscode.env.clipboard.readText();

    assert.equal(copied, `turbo run ${BUILD_TASK} --filter=${pair.leaf.name}`);
  });
};

/**
 * Spec §5.3 case 8 (Nx parity, §4.6): the palette picker, the `package.json` action, open, copy, run everywhere, run
 * affected, the two fixed views and the folders default. Step 9 (cleanup) has nothing to restore: the README commit stays
 * and touches no keyed file. Run after case 3, on the leaf `build` (a regular package nothing depends on) and, for the
 * `package.json` action and the affected check, a second such package.
 */
export const parityCase = async (api: TurboConsoleApi, root: string, manifest: ShownManifest, env: SuiteEnv): Promise<void> => {
  const { turboPath, budgetFactor } = env;

  if (turboPath === null) throw new Error('case 8 needs the dev turbo path');

  const pair = leafPair(manifest);
  const scene: ParityScene = { api, root, turboPath, budgetFactor, manifest, pair };

  await pickerCase(scene);
  await packageJsonCase(scene);
  await openCase(scene);
  await copyCase(scene);
  await everywhereCase(scene);
  await affectedCase(scene);
  await fixedViewsCase(scene);
  await openSpecRegisteredCase();
  await foldersCase(scene);
};
