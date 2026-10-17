import * as vscode from 'vscode';

import { log, waitFor } from './suite-env.spec.util.ts';
import type { ShellFacts, ShellWatch } from '../common/scripts.type.ts';

type Quoted = string | vscode.ShellQuotedString;

const textOf = (part: Quoted): string => (typeof part === 'string' ? part : part.value);

const cwdOf = (execution: vscode.ShellExecution): string | null => {
  const cwd = execution.options?.cwd;

  return cwd ?? null;
};

const shellFactsOf = (task: vscode.Task): ShellFacts | null => {
  const { execution } = task;

  if (!(execution instanceof vscode.ShellExecution)) return null;

  const { command, args } = execution;

  if (command === undefined) return null;

  const parts = args ?? [];
  const areArgsPlain = parts.every((part) => typeof part === 'string');
  const facts: ShellFacts = { command: textOf(command), args: parts.map(textOf), cwd: cwdOf(execution), areArgsPlain };

  return facts;
};

/** The terminals of the task `taskId`, named after it. */
export const scriptTerminals = (taskId: string): vscode.Terminal[] =>
  vscode.window.terminals.filter((candidate) => candidate.name.includes(taskId));

/** Records the shell execution of the task named `taskId` when it starts, since a fast script is gone from `taskExecutions` by then. */
export const watchShell = (taskId: string): ShellWatch => {
  let seen: ShellFacts | null = null;
  const listening = vscode.tasks.onDidStartTask(({ execution }) => {
    const isOfRun = execution.task.name === taskId;

    if (isOfRun) seen = shellFactsOf(execution.task);
  });
  const watch: ShellWatch = {
    facts: () => seen,
    dispose: () => {
      listening.dispose();
    }
  };

  return watch;
};

const VERSION_TASK = 'l10-pnpm-version';

type VersionEnd = { readonly hasEnded: boolean; readonly exitCode: number | undefined };

/** Spec 1c-b §6.3 case 3, V3: `pnpm --version` as a one-off task of the task shell; logs its exit code, which is 0 when the shell finds pnpm. */
export const logPnpmVersion = async (root: string): Promise<void> => {
  const folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(root));
  const execution = new vscode.ShellExecution('pnpm', ['--version'], { cwd: root });
  const task = new vscode.Task({ type: 'shell' }, folder ?? vscode.TaskScope.Workspace, VERSION_TASK, 'turbo-console-it', execution);
  let end: VersionEnd = { hasEnded: false, exitCode: undefined };
  const listening = vscode.tasks.onDidEndTaskProcess((event) => {
    const isOwn = event.execution.task.name === VERSION_TASK;

    if (isOwn) end = { hasEnded: true, exitCode: event.exitCode };
  });

  try {
    await vscode.tasks.executeTask(task);
    await waitFor('pnpm --version ended', () => end.hasEnded);
    log(`V3: pnpm --version in the task shell exited ${String(end.exitCode)} on ${process.platform}`);
  } finally {
    listening.dispose();

    for (const terminal of scriptTerminals(VERSION_TASK)) terminal.dispose();
  }
};
