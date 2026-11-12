import * as vscode from 'vscode';

import { driveCommand } from './quick-input-drive.spec.util.ts';
import { startRunBy } from './run-wait.spec.util.ts';
import { sleep } from './suite-env.spec.util.ts';
import { readSuiteEnv } from './suite-input.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { TreeNode } from '../../src/tree/common/tree-node.type.ts';
import { RUN_OPTIONS_COMMAND } from '../common/run-options.const.ts';

type Step = (factor: number) => Promise<void>;

/** How long the quick pick gets (x budgetFactor) to open before the suite sends it a key; the parity pick uses 200. */
const PICK_OPEN_MS = 300;

/** A multi-select quick pick opens with no row highlighted (VS Code 1.141.0), so the first move lands on row 0. */
const FIRST_HIGHLIGHT = -1;

const runCommand = async (command: string): Promise<void> => {
  await vscode.commands.executeCommand(command);
};

const moveTo = async (from: number, to: number): Promise<void> => {
  for (let at = from; at < to; at += 1) await runCommand('workbench.action.quickOpenSelectNext');
};

const assertAscending = (rows: number[]): void => {
  const isAscending = rows.every((row, index) => index === 0 || row > (rows[index - 1] ?? 0));

  if (!isAscending) throw new Error(`rows must ascend: ${rows.join(', ')}`);
};

const pickRowsStep = (rows: number[]): Step => {
  const pick: Step = async (factor) => {
    assertAscending(rows);
    await sleep(PICK_OPEN_MS * factor);

    let highlight = FIRST_HIGHLIGHT;

    for (const row of rows) {
      await moveTo(highlight, row);
      await runCommand('workbench.action.quickPickManyToggle');

      highlight = row;
    }

    await runCommand('workbench.action.acceptSelectedQuickOpenItem');
  };

  return pick;
};

/** Runs Run with Options on `node` and drives its quick inputs with `steps` (`driveCommand`). */
const driveOptions = async (node: TreeNode, steps: Step[]): Promise<void> => {
  const { budgetFactor } = readSuiteEnv();

  await driveCommand(RUN_OPTIONS_COMMAND, [node], steps, budgetFactor);
};

/** Pastes `text` into the open input box: VS Code has no command that sets a quick input's value (spiked: `type` did not reach it). */
const writeBox = async (text: string): Promise<void> => {
  await vscode.env.clipboard.writeText(text);
  await runCommand('editor.action.clipboardPasteAction');
};

const typeStep = (text: string): Step => {
  const typeIn: Step = async (factor) => {
    await sleep(PICK_OPEN_MS * factor);
    await writeBox(text);
    await runCommand('workbench.action.acceptSelectedQuickOpenItem');
  };

  return typeIn;
};

/** Runs Run with Options on `node`: checks the given 0-based picker rows (strictly ascending), accepts; returns the launch token. */
export const runWithPicks = async (api: TurboConsoleApi, node: TreeNode, rows: number[]): Promise<number> =>
  startRunBy(api, node, async () => driveOptions(node, [pickRowsStep(rows)]));

/** Like `runWithPicks`, then pastes `text` into the Extra arguments box and accepts it. */
export const runWithText = async (api: TurboConsoleApi, node: TreeNode, rows: number[], text: string): Promise<number> =>
  startRunBy(api, node, async () => driveOptions(node, [pickRowsStep(rows), typeStep(text)]));

/** A script row opens only the arguments box. */
export const runScriptWithText = async (api: TurboConsoleApi, node: TreeNode, text: string): Promise<number> =>
  startRunBy(api, node, async () => driveOptions(node, [typeStep(text)]));
