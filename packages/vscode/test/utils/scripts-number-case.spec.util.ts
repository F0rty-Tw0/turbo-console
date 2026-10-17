import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import * as vscode from 'vscode';

import { packageDirOf } from './package-edit.spec.util.ts';
import { endedRun, startRun } from './run-wait.spec.util.ts';
import { watchShell } from './scripts-shell.spec.util.ts';
import { scriptNodeNamed } from './scripts-tree.spec.util.ts';
import { log, step } from './suite-env.spec.util.ts';
import { logExit } from './tree-polish-run.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import {
  NUMBER_COPY_TEXT,
  NUMBER_SCRIPT,
  NUMBER_SENTINEL,
  NUMBER_SENTINEL_PATH,
  NUMBER_TASK_ID,
  SCRIPTS_PACKAGE
} from '../common/scripts.const.ts';

/** Copy Command on `node` puts `pnpm run 1kb` on the clipboard, bare, whatever the user's shell (`env.shell`). */
const assertCopied = async (node: TreeNode): Promise<void> => {
  await vscode.env.clipboard.writeText('');
  await vscode.commands.executeCommand('turboConsole.copyCommand', node);

  const copied = await vscode.env.clipboard.readText();

  log(`copied ${JSON.stringify(copied)} under ${vscode.env.shell} on ${process.platform}`);
  assert.equal(copied, NUMBER_COPY_TEXT);
};

/** Run on `node` ends `passed` and leaves the sentinel only the `1kb` script writes, so a run of any other script fails. */
const assertRan = async (api: TurboConsoleApi, node: TreeNode, sentinel: string): Promise<void> => {
  const watch = watchShell(NUMBER_TASK_ID);

  try {
    const launchedAt = await startRun(api, node);
    const ended = await endedRun(api, node, launchedAt);
    const facts = watch.facts();

    logExit('script 1kb', ended);
    log(`ShellExecution ${JSON.stringify(facts)} on ${process.platform}`);
    assert.equal(ended.state, 'passed');
    assert.deepEqual(facts?.args, ['run', NUMBER_SCRIPT]);
    assert.equal(facts.areArgsPlain, true);
    assert.equal(await readFile(sentinel, 'utf8'), NUMBER_SENTINEL);
  } finally {
    watch.dispose();
  }
};

/**
 * Case 8: a script whose name starts with a digit, `1kb`, copies bare and its Run runs it bare, on every OS: on Windows CI
 * the terminal shell is the runner's default PowerShell, which the case logs. Scripts are hidden again at the end.
 */
export const numberNameCase = async (api: TurboConsoleApi, root: string): Promise<void> => {
  await step('L10-8: the digit-led script 1kb copies bare, and its Run runs 1kb', async () => {
    await vscode.commands.executeCommand('turboConsole.showScripts');

    try {
      const node = await scriptNodeNamed(api, SCRIPTS_PACKAGE, NUMBER_TASK_ID);
      const dir = await packageDirOf(root, SCRIPTS_PACKAGE);
      const sentinel = join(dir, ...NUMBER_SENTINEL_PATH);

      await rm(sentinel, { force: true });
      await assertCopied(node);
      await assertRan(api, node, sentinel);
    } finally {
      await vscode.commands.executeCommand('turboConsole.hideScripts');
    }
  });
};
