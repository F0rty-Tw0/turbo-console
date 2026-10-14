import type { RunMatch, RunToMatch, TaskNode } from '@turbo-console/core';

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
};

export type RunLookup = (root: string, taskId: string) => RunEntry | undefined;

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
};

/**
 * Editor effects of the run flow. `canExecute` answers whether `binaryPath` exists and may be run; `after` calls
 * `action` once `delayMs` has passed; `log` takes a finished line (`logTextOf`); `now` is wall-clock milliseconds, as
 * the run summary files' times are.
 */
export type RunPorts = {
  readonly canExecute: (binaryPath: string) => Promise<boolean>;
  readonly execute: (request: RunRequest, args: string[]) => Promise<Terminable>;
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
  readonly failStart: (definition: RunDefinition, at: number, launchedAt?: number) => RunEntry | null;
  readonly setMatch: (definition: RunDefinition, launchedAt: number, match: RunMatch | null) => void;
  readonly get: RunLookup;
  readonly onDidChange: (listener: RunListener) => () => void;
};
