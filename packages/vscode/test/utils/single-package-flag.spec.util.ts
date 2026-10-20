import assert from 'node:assert/strict';

import { turboRunAllArgs } from '@turbo-console/core';
import * as vscode from 'vscode';

import { runPicked } from './parity-pick.spec.util.ts';
import { finishedAllRun, watchAllRun } from './parity-run.spec.util.ts';
import { taskNodeNamed } from './run-wait.spec.util.ts';
import { step } from './suite-env.spec.util.ts';
import { whenQuiet } from './watch-wait.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import { BUILD_TASK } from '../common/parity.const.ts';
import type { PickStep } from '../common/parity.type.ts';
import { ROOT_BUILD_ID, ROOT_PACKAGE, SINGLE_TASK_IDS } from '../common/single-package.const.ts';

const SINGLE_PACKAGE_FLAG = '--single-package';

const ID_PREFIX = `${ROOT_PACKAGE}#`;

const taskNameOf = (id: string): string => id.slice(ID_PREFIX.length);

/** The palette's task pick: the fixture's task names, with `build` wanted. */
const buildStep = (): PickStep => {
  const list = SINGLE_TASK_IDS.map(taskNameOf);
  const pick: PickStep = { list, wanted: BUILD_TASK };

  return pick;
};

/** Copy Command on the `//#build` row puts a `turbo run build` command ending with `--single-package` on the clipboard. */
const assertCopyFlagged = async (api: TurboConsoleApi): Promise<void> => {
  const node = await taskNodeNamed(api, ROOT_PACKAGE, ROOT_BUILD_ID);

  await vscode.env.clipboard.writeText('');
  await vscode.commands.executeCommand('turboConsole.copyCommand', node);

  const copied = await vscode.env.clipboard.readText();

  assert.ok(copied.startsWith(`turbo run ${BUILD_TASK}`), `copied ${JSON.stringify(copied)}`);
  assert.ok(copied.endsWith(` ${SINGLE_PACKAGE_FLAG}`), `copied ${JSON.stringify(copied)}`);
};

/** Run Task in All Packages… with `build` picked starts `turbo run build --single-package` and the process exits 0. */
const assertRunAllFlagged = async (root: string, budgetFactor: number): Promise<void> => {
  const watch = watchAllRun(root, BUILD_TASK, false);

  try {
    await runPicked('turboConsole.runEverywhere', [buildStep()], budgetFactor);

    const [args, code] = await finishedAllRun(watch, 'run everywhere');

    assert.deepEqual(args, turboRunAllArgs(BUILD_TASK, { affected: false }, true));
    assert.ok(args.includes(SINGLE_PACKAGE_FLAG), `run all args ${JSON.stringify(args)}`);
    assert.equal(code, 0, `run everywhere exited ${code}`);
  } finally {
    watch.dispose();
  }
};

/**
 * L11-5 (spec §2.2): in a single-package repo the two commands that name no package, Copy Command and Run Task in All
 * Packages…, both carry `--single-package`. The run all runs the real task, which may rewrite `pnpm-lock.yaml`, so the
 * case ends quiet.
 */
export const flagCase = async (api: TurboConsoleApi, root: string, budgetFactor: number): Promise<void> => {
  await step('L11-5: Copy Command and Run Task in All Packages… both pass --single-package', async () => {
    await assertCopyFlagged(api);
    await assertRunAllFlagged(root, budgetFactor);
    await whenQuiet(api, root);
  });
};
