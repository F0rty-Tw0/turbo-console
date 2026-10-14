import * as vscode from 'vscode';

import type { RunAllEvents, RunAllLaunch } from '../common/run-all.type.ts';
import type { RunDefinition, RunRequest, TaskEvents, Terminable } from '../common/run.type.ts';
import { runAllDefinitionOf, runAllKeyOf, runAllTaskDefinitionOf } from '../utils/run-all-task.util.ts';
import { isTaskOf, runEventOf, taskDefinitionOf } from '../utils/run-event.util.ts';

type ProcessLaunch = {
  readonly root: string;
  readonly binaryPath: string;
  readonly args: string[];
};

const folderOf = (root: string): vscode.WorkspaceFolder => {
  const folder = vscode.workspace.workspaceFolders?.find((candidate) => candidate.uri.fsPath === root);

  if (folder === undefined) throw new Error(`no workspace folder for ${root}`);

  return folder;
};

/** A turbo process as a `vscode.Task` in a dedicated terminal panel per task identity, cleared and revealed on each run. */
const executeProcessTask = async (
  definition: vscode.TaskDefinition,
  name: string,
  process: ProcessLaunch
): Promise<vscode.TaskExecution> => {
  const folder = folderOf(process.root);
  const execution = new vscode.ProcessExecution(process.binaryPath, process.args, { cwd: process.root });
  const task = new vscode.Task(definition, folder, name, 'turbo', execution);
  const presentation: vscode.TaskPresentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    panel: vscode.TaskPanelKind.Dedicated,
    clear: true
  };

  task.presentationOptions = presentation;

  return vscode.tasks.executeTask(task);
};

/**
 * Spec §4.5 step 3: runs turbo as a `vscode.Task` named after the task id. Rejects when `request.root` is no workspace
 * folder.
 */
export const executeTurboTask = async (request: RunRequest, args: string[], launchedAt: number): Promise<Terminable> => {
  const definition = taskDefinitionOf(request, launchedAt);
  const process: ProcessLaunch = { root: request.root, binaryPath: request.binaryPath, args };

  return executeProcessTask(definition, request.task.id, process);
};

/**
 * Spec §4.6.5: `turbo run <task>` over all packages as a task named after its id and flag, in a terminal panel of its
 * own. Resolves with the execution once VS Code has started it; rejects when `launch.root` is no workspace folder.
 */
export const executeRunAllTask = async (launch: RunAllLaunch, args: string[]): Promise<Terminable> => {
  const definition = runAllTaskDefinitionOf(launch);
  const flag = launch.affected ? ' --affected' : '';
  const process: ProcessLaunch = { root: launch.root, binaryPath: launch.binaryPath, args };

  return executeProcessTask(definition, `${definition.id}${flag}`, process);
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

/** Whether VS Code runs a task whose guard key is `key`, one this window did not launch (Rerun Last Task) included. */
export const isRunAllActive = (key: string): boolean => {
  const isOfKey = ({ task }: vscode.TaskExecution): boolean => {
    const definition = runAllDefinitionOf(task.definition);

    return definition !== null && runAllKeyOf(definition) === key;
  };

  return vscode.tasks.taskExecutions.some(isOfKey);
};

/** Forwards the process starts and task ends of run all tasks to `events`; every other task is dropped. */
export const forwardRunAllEvents = (events: RunAllEvents): vscode.Disposable => {
  const onProcessStart = ({ execution }: vscode.TaskProcessStartEvent): void => {
    const definition = runAllDefinitionOf(execution.task.definition);

    if (definition !== null) events.processStarted(definition);
  };
  const onTaskEnd = ({ execution }: vscode.TaskEndEvent): void => {
    const definition = runAllDefinitionOf(execution.task.definition);

    if (definition !== null) events.taskEnded(definition);
  };
  const started = vscode.tasks.onDidStartTaskProcess(onProcessStart);
  const ended = vscode.tasks.onDidEndTask(onTaskEnd);

  return vscode.Disposable.from(started, ended);
};
