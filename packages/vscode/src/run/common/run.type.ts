import type { RunMatch, RunToMatch, TaskNode } from '@turbo-console/core';

import type { RootChange } from '../../roots/common/coordinator.type.ts';

export type RunState = 'running' | 'passed' | 'failed' | 'stopped' | 'failed-to-start';

/**
 * One run of one task. `matching` is true from the process end until `finishRun` settles (match found, none found or a
 * match error), so a reader never sees a half-finished result: while it is true the display shows the not-matched text.
 */
export type RunEntry = {
  readonly root: string;
  readonly taskId: string;
  readonly packageName: string;
  readonly task: TaskNode;
  readonly state: RunState;
  readonly launchedAt: number;
  readonly processStartedAt: number | null;
  readonly endedAt: number | null;
  readonly exitCode: number | null;
  readonly stopRequested: boolean;
  readonly match: RunMatch | null;
  readonly matching: boolean;
  /** Run Without Cache: the run passed `--force`, so its summary records `MISS` whatever the cache held. */
  readonly force: boolean;
};

export type RunLookup = (root: string, taskId: string) => RunEntry | undefined;

/** The task ids of `root` whose run is running, a fresh set per call. `root` is the folder root every run is keyed by. */
export type LiveIds = (root: string) => ReadonlySet<string>;

export type RunListener = (entry: RunEntry) => void;

/** `<root>\0<task id>`: at most one running entry per key. */
export type RunKey = string;

/** The `root` and `id` of a run's task definition: what every task event is matched by. */
export type RunDefinition = {
  readonly root: string;
  readonly id: string;
};

/** The part of a `vscode.TaskExecution` the run store keeps, for Stop. */
export type Terminable = {
  readonly terminate: () => void;
};

export type RunRequest = {
  readonly root: string;
  readonly packageName: string;
  readonly task: TaskNode;
  readonly binaryPath: string;
  readonly force: boolean;
};

/**
 * Editor effects of the run flow. `canExecute` answers whether `binaryPath` exists and may be run; `isActive` whether
 * VS Code already runs a task of `definition`, one the store may not know (Rerun Last Task, a reconnect); `after` calls
 * `action` once `delayMs` has passed; `log` takes a finished line (`logTextOf`); `now` is wall-clock milliseconds, as
 * the run summary files' times are.
 */
export type RunPorts = {
  readonly canExecute: (binaryPath: string) => Promise<boolean>;
  readonly isActive: (definition: RunDefinition) => boolean;
  readonly execute: (request: RunRequest, args: string[], launchedAt: number) => Promise<Terminable>;
  readonly after: (delayMs: number, action: () => void) => void;
  readonly match: (root: string, run: RunToMatch) => Promise<RunMatch | null>;
  readonly notifyFailedToStart: () => void;
  readonly info: (text: string) => void;
  readonly log: (line: string) => void;
  readonly now: () => number;
};

/** The public face of `RunStore` that the run flow drives. */
export type Runs = {
  readonly tryStart: (request: RunRequest, now: number) => boolean;
  readonly attach: (definition: RunDefinition, launchedAt: number, execution: Terminable) => void;
  readonly failStart: (definition: RunDefinition, at: number, launchedAt?: number, isTaskEnded?: boolean) => RunEntry | null;
  readonly setMatch: (definition: RunDefinition, launchedAt: number, match: RunMatch | null) => void;
  readonly get: RunLookup;
  readonly runningIds: LiveIds;
  readonly onDidChange: (listener: RunListener) => () => void;
};

/**
 * The definition of the `vscode.Task` of one run. `launchedAt` is its launch token; it is left out of the declared
 * task definition schema, since VS Code builds a task's identity from the declared keys and would give every run a new
 * terminal panel. Events of an execution VS Code started itself (Rerun Last Task) carry no token.
 */
export type RunTaskDefinition = {
  readonly type: string;
  readonly root: string;
  readonly id: string;
  readonly launchedAt: number;
};

/** A task event of one run: its task and its launch token. */
export type RunEvent = {
  readonly definition: RunDefinition;
  readonly launchedAt: number;
};

/** The task events the editor forwards, already narrowed to runs of this extension. */
export type TaskEvents = {
  readonly processStarted: (event: RunEvent) => void;
  readonly processEnded: (event: RunEvent, exitCode: number | undefined) => void;
  readonly taskEnded: (event: RunEvent) => void;
};

type RunCommands = {
  readonly runs: Runs;
  readonly run: (request: RunRequest) => Promise<void>;
  readonly stop: (definition: RunDefinition) => void;
  readonly rootChanged: (change: RootChange) => void;
};

/** The public face of `RunSession` that the run commands and the task events drive. */
export type RunControl = TaskEvents & RunCommands;

/** The task a Run Task or Stop Task command was invoked on. */
export type TaskTarget = {
  readonly definition: RunDefinition;
  readonly packageName: string;
};

/** `vscode.window.showErrorMessage` with one action: resolves with the action picked, or `undefined` when closed. */
export type ShowError = (text: string, action: string) => PromiseLike<string | undefined>;

export type Disposed = {
  readonly dispose: () => void;
};

/** `vscode.commands.registerCommand`. */
export type CommandRegistry = (command: string, callback: (arg: unknown) => unknown) => Disposed;
