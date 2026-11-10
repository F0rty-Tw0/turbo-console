import assert from 'node:assert/strict';

import * as vscode from 'vscode';

import { descriptionIfAny } from './prediction-scene.spec.util.ts';
import { countTurboSpawns } from './spawn-counter.spec.util.ts';
import { sleep, step, waitFor } from './suite-env.spec.util.ts';
import { packageNodes } from './tree-polish-tree.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import { HIDE_PREDICTION_COMMAND, PREDICTION_WORD_SET, QUIET_WINDOW_MS, SHOW_PREDICTION_COMMAND } from '../common/prediction.const.ts';
import { PERSISTENT_ROOT_ID, SINGLE_TASK_IDS } from '../common/single-package.const.ts';

const SINGLE_PACKAGE_ARG = '--single-package';

const isTaskRow = (node: TreeNode): boolean => node.kind === 'task';

const isPredictable = (id: string): boolean => id !== PERSISTENT_ROOT_ID;

/** The turbo tasks of the fixture a dry run asks for: all but the persistent one, sorted. */
const PREDICTED_IDS: string[] = SINGLE_TASK_IDS.filter(isPredictable);

/** The task names a dry run's args list between `run` and the first flag. */
const taskNamesOf = (args: string[]): string[] => {
  const afterRun = args.slice(args.indexOf('run') + 1);
  const isName = (arg: string): boolean => !arg.startsWith('--');

  return afterRun.filter(isName).toSorted();
};

const keyOf = (node: TreeNode): string => node.key;

const idOfName = (name: string): string => `//#${name}`;

/**
 * L11-11 (M3-1 Review Focus 3): with the toggle on, the one package row of a single-package root, once expanded, makes one
 * dry run that carries `--single-package`, and every task row it asked for reads a prediction word. The persistent
 * `dev` is not asked for and reads none. The toggle goes off again at the end, so the later cases see the default.
 */
export const predictionCase = async (api: TurboConsoleApi, turboPath: string | null): Promise<void> => {
  await step('L11-11: toggle on, the // package makes one --single-package dry run and its task rows read a word', async () => {
    const counter = countTurboSpawns(turboPath);

    try {
      await vscode.commands.executeCommand(SHOW_PREDICTION_COMMAND);
      counter.reset();

      const [pkg] = await packageNodes(api);

      if (pkg === undefined) throw new Error('the tree holds no package row');

      const children = await api.tree.getChildren(pkg);
      const rows = children.filter(isTaskRow);
      const hasWord = (row: TreeNode): boolean => PREDICTION_WORD_SET.has(descriptionIfAny(api, row));
      const predicted = (): TreeNode[] => rows.filter(hasWord);

      await waitFor('the task rows read a prediction word', () => predicted().length === PREDICTED_IDS.length);
      await sleep(QUIET_WINDOW_MS);

      const spawned = counter.dryRuns();
      const [args = []] = spawned;
      const names = taskNamesOf(args);
      const wordedIds = predicted().map(keyOf);

      assert.equal(spawned.length, 1, `dry runs: ${JSON.stringify(spawned)}`);
      assert.ok(args.includes(SINGLE_PACKAGE_ARG), `no ${SINGLE_PACKAGE_ARG} in ${JSON.stringify(args)}`);
      assert.deepEqual(names.map(idOfName), PREDICTED_IDS);
      assert.deepEqual(wordedIds.toSorted(), PREDICTED_IDS);
    } finally {
      counter.dispose();
      await vscode.commands.executeCommand(HIDE_PREDICTION_COMMAND);
    }
  });
};
