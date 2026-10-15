import assert from 'node:assert/strict';

import * as vscode from 'vscode';

import { log } from './suite-env.spec.util.ts';

const terminalsOf = (taskId: string): string[] => {
  const names = vscode.window.terminals.map((terminal) => terminal.name);

  log(`terminals: ${names.join(', ')}`);

  return names.filter((name) => name.includes(taskId));
};

/** The run's dedicated terminal, named after its task id, is still open after the run ended, its output kept. */
export const assertTerminalKept = (taskId: string): void => {
  const terminals = terminalsOf(taskId);

  assert.ok(terminals.length > 0, `no terminal of ${taskId} is open`);
};

/**
 * Spec §4.5 step 3: every run of a task reuses its one dedicated terminal. VS Code keys that reuse on the task's
 * declared definition keys, which is why the launch token stays undeclared.
 */
export const assertOneTerminal = (taskId: string): void => {
  const terminals = terminalsOf(taskId);

  assert.equal(terminals.length, 1, `terminals of ${taskId}: ${terminals.join(', ')}`);
};
