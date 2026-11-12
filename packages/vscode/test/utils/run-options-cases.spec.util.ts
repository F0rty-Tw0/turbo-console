import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import * as vscode from 'vscode';

import { packageDirOf } from './package-edit.spec.util.ts';
import { runScriptWithText, runWithPicks, runWithText } from './run-options-drive.spec.util.ts';
import { endedRun, startRun, taskNodeNamed } from './run-wait.spec.util.ts';
import { watchShell } from './scripts-shell.spec.util.ts';
import { scriptNodeNamed } from './scripts-tree.spec.util.ts';
import { step } from './suite-env.spec.util.ts';
import { watchStartedArgs } from './tree-polish-cache.spec.util.ts';
import { tooltipLinesOf } from './tree-polish-tree.spec.util.ts';
import type { RunEntry } from '../../src/run/common/run.type.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import {
  ARGS_SCRIPT,
  ARGS_TASK_ID,
  ARGV_PATH,
  OPTIONS_BUILD_ID,
  OPTIONS_PACKAGE,
  OPTION_ARGS,
  PICK_ROW,
  SCRIPT_ARGS
} from '../common/run-options.const.ts';

type StartedRun = { readonly args: string[]; readonly starts: number; readonly ended: RunEntry };

const argvOf = async (dir: string): Promise<unknown> => {
  const text = await readFile(join(dir, ...ARGV_PATH), 'utf8');

  return JSON.parse(text);
};

const clearArgv = async (dir: string): Promise<void> => rm(join(dir, ...ARGV_PATH), { force: true });

/** Starts a run through `start` (returns the launch token), waits for its end; returns the process args VS Code started it with. */
const argsOfRun = async (api: TurboConsoleApi, node: TreeNode, start: () => Promise<number>): Promise<StartedRun> => {
  const started = watchStartedArgs(OPTIONS_BUILD_ID);

  try {
    const launchedAt = await start();
    const ended = await endedRun(api, node, launchedAt);
    const run: StartedRun = { args: started.args(), starts: started.starts(), ended };

    return run;
  } finally {
    started.dispose();
  }
};

/** I3: an empty pick starts the same process and records the same entry as the plain Run. Returns the plain Run's args. */
export const emptyPickCase = async (api: TurboConsoleApi): Promise<string[]> => {
  let plainArgs: string[] = [];

  await step('L19-3: an empty pick runs the same argv and entry as Run (I3)', async () => {
    const node = await taskNodeNamed(api, OPTIONS_PACKAGE, OPTIONS_BUILD_ID);
    const plain = await argsOfRun(api, node, async () => startRun(api, node));
    const empty = await argsOfRun(api, node, async () => runWithPicks(api, node, []));

    assert.deepEqual(empty.args, plain.args);
    assert.ok(empty.args.includes('--summarize'), `args: ${empty.args.join(' ')}`);
    assert.equal(plain.starts, 1);
    assert.equal(empty.starts, 1);
    assert.equal(empty.ended.state, 'passed');
    assert.equal(empty.ended.force, false);
    assert.equal('extras' in empty.ended, false);

    plainArgs = plain.args;
  });

  return plainArgs;
};

/**
 * I1: Only + Keep going + Extra arguments launch the spec §5 argv (the plain Run's `plainArgs`, then the options), record
 * the entry and the tooltip line, and reach the script.
 */
export const turboOptionsCase = async (api: TurboConsoleApi, plainArgs: string[]): Promise<void> => {
  await step('L19-1: Only + Keep going + Extra --watch launches spec §5 argv, records Options and passes the args', async () => {
    const node = await taskNodeNamed(api, OPTIONS_PACKAGE, OPTIONS_BUILD_ID);
    const dir = await packageDirOf(node.root, OPTIONS_PACKAGE);

    await clearArgv(dir);

    const rows = [PICK_ROW.only, PICK_ROW.continueMode, PICK_ROW.args];
    const run = await argsOfRun(api, node, async () => runWithText(api, node, rows, OPTION_ARGS.join(' ')));
    const lines = tooltipLinesOf(api.tree.getTreeItem(node));

    assert.deepEqual(run.args, [...plainArgs, '--only', '--continue=dependencies-successful', '--', ...OPTION_ARGS]);
    assert.equal(run.ended.state, 'passed');
    assert.equal(run.ended.match?.cache, 'MISS');
    assert.deepEqual(run.ended.extras, { only: true, continueMode: 'dependencies-successful', passThrough: OPTION_ARGS });
    assert.deepEqual(await argvOf(dir), OPTION_ARGS);
    assert.ok(lines.includes('Options: --only --continue=dependencies-successful -- --watch'), lines.join(' | '));
  });
};

/** I2: a script row on pnpm runs `pnpm run <name> <args>` with plain-string args, and the script gets them. */
export const scriptArgsCase = async (api: TurboConsoleApi): Promise<void> => {
  await step('L19-2: a script row with four args runs pnpm run <name> <args> as plain strings and the script gets them', async () => {
    await vscode.commands.executeCommand('turboConsole.showScripts');

    const node = await scriptNodeNamed(api, OPTIONS_PACKAGE, ARGS_TASK_ID);
    const dir = await packageDirOf(node.root, OPTIONS_PACKAGE);
    const watch = watchShell(ARGS_TASK_ID);

    await clearArgv(dir);

    try {
      const launchedAt = await runScriptWithText(api, node, SCRIPT_ARGS.join(' '));
      const ended = await endedRun(api, node, launchedAt);
      const facts = watch.facts();
      const lines = tooltipLinesOf(api.tree.getTreeItem(node));

      assert.ok(facts !== null, 'no shell execution seen for the run');
      assert.equal(facts.command, 'pnpm');
      assert.deepEqual(facts.args, ['run', ARGS_SCRIPT, ...SCRIPT_ARGS]);
      assert.equal(facts.areArgsPlain, true);
      assert.equal(ended.state, 'passed');
      assert.deepEqual(ended.extras, { passThrough: SCRIPT_ARGS });
      assert.deepEqual(await argvOf(dir), SCRIPT_ARGS);
      assert.ok(lines.includes(`Arguments: ${SCRIPT_ARGS.join(' ')}`), lines.join(' | '));
    } finally {
      watch.dispose();
    }
  });
};
