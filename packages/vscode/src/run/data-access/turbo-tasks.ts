import * as vscode from 'vscode';

import type { RunDefinition, RunRequest, TaskEvents, Terminable } from '../common/run.type.ts';
import { isTaskOf, runEventOf, taskDefinitionOf } from '../utils/run-event.util.ts';

/**
 * Spec §4.5 step 3: runs turbo as a `vscode.Task` named after the task id, in a dedicated terminal panel per task id
 * that is cleared and revealed on each run. Rejects when `request.root` is no workspace folder.
 */
export const executeTurboTask = async (request: RunRequest, args: string[], launchedAt: number): Promise<Terminable> => {
  const folder = vscode.workspace.workspaceFolders?.find((candidate) => candidate.uri.fsPath === request.root);

  if (folder === undefined) throw new Error(`no workspace folder for ${request.root}`);

  const definition = taskDefinitionOf(request, launchedAt);
  const execution = new vscode.ProcessExecution(request.binaryPath, args, { cwd: request.root });
  const task = new vscode.Task(definition, folder, request.task.id, 'turbo', execution);
  const presentation: vscode.TaskPresentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    panel: vscode.TaskPanelKind.Dedicated,
    clear: true
  };

  task.presentationOptions = presentation;

  return vscode.tasks.executeTask(task);
};

/** Whether VS Code runs a task of `run`, a task it started itself (Rerun Last Task, a reconnect) included. */
export const isTurboTaskActive = (run: RunDefinition): boolean => {
  const isOfRun = ({ task }: vscode.TaskExecution): boolean => isTaskOf(task.definition, run);

  return vscode.tasks.taskExecutions.some(isOfRun);
};

/**
 * Forwards the task events of runs this window launched to `events`; every other task, a task VS Code rebuilt itself
 * included, is dropped by `runEventOf`.
 */
export const forwardTaskEvents = (events: TaskEvents): vscode.Disposable => {
  const onProcessStart = ({ execution }: vscode.TaskProcessStartEvent): void => {
    const event = runEventOf(execution.task.definition);

    if (event !== null) events.processStarted(event);
  };
  const onProcessEnd = ({ execution, exitCode }: vscode.TaskProcessEndEvent): void => {
    const event = runEventOf(execution.task.definition);

    if (event !== null) events.processEnded(event, exitCode);
  };
  const onTaskEnd = ({ execution }: vscode.TaskEndEvent): void => {
    const event = runEventOf(execution.task.definition);

    if (event !== null) events.taskEnded(event);
  };
  const started = vscode.tasks.onDidStartTaskProcess(onProcessStart);
  const processEnded = vscode.tasks.onDidEndTaskProcess(onProcessEnd);
  const taskEnded = vscode.tasks.onDidEndTask(onTaskEnd);

  return vscode.Disposable.from(started, processEnded, taskEnded);
};
