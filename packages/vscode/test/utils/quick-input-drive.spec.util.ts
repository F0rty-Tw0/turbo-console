import * as vscode from 'vscode';

import { waitFor } from './suite-env.spec.util.ts';

/** One move on the open quick input (keys, paste, accept); gets the suite's budget factor. */
type InputStep = (factor: number) => Promise<void>;

const FINISH_MS = 10_000;

/**
 * Starts `command` with `args` without awaiting it, runs each step on the quick inputs it opens in turn, then waits for the
 * command to finish. The inputs are driven through VS Code's quick-open commands, as a user's keys would. A step that
 * fails, or a command that never finishes, closes the quick input (which settles the pending ask with `undefined`) and
 * fails with the command named, instead of hanging.
 */
export const driveCommand = async (command: string, args: unknown[], steps: InputStep[], factor: number): Promise<void> => {
  let isDone = false;

  const finished = Promise.resolve(vscode.commands.executeCommand(command, ...args)).finally(() => {
    isDone = true;
  });

  try {
    for (const step of steps) await step(factor);

    await waitFor(`${command} to finish`, () => isDone, FINISH_MS * factor);
  } catch (error) {
    await vscode.commands.executeCommand('workbench.action.closeQuickOpen');

    void finished.catch(() => undefined);

    throw new Error(`${command} did not complete: ${String(error)}`, { cause: error });
  }

  await finished;
};
