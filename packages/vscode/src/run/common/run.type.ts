import type { RunMatch, TaskNode } from '@turbo-console/core';

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
