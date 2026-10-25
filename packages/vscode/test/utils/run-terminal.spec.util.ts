import assert from 'node:assert/strict';

import * as vscode from 'vscode';

import { scriptTerminals } from './scripts-shell.spec.util.ts';
import { log } from './suite-env.spec.util.ts';
import { awaitTerminals } from './tree-polish-live.spec.util.ts';

const terminalsOf = async (taskId: string): Promise<string[]> => {
  const terminals = await awaitTerminals(taskId, () => scriptTerminals(taskId), []);

  log(`terminals: ${vscode.window.terminals.map((terminal) => terminal.name).join(', ')}`);

  return terminals.map((terminal) => terminal.name);
};

/**
 * The run's dedicated terminal, named after its task id, is still open after the run ended, its output kept. The wait in
 * `terminalsOf` throws when none opens.
 */
export const assertTerminalKept = async (taskId: string): Promise<void> => {
  await terminalsOf(taskId);
};

/**
 * Spec §4.5 step 3: every run of a task reuses its one dedicated terminal. VS Code keys that reuse on the task's
 * declared definition keys, which is why the launch token stays undeclared.
 */
export const assertOneTerminal = async (taskId: string): Promise<void> => {
  const terminals = await terminalsOf(taskId);

  assert.equal(terminals.length, 1, `terminals of ${taskId}: ${terminals.join(', ')}`);
};
