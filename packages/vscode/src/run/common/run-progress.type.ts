import type { RunLogEvent } from '@turbo-console/core';

import type { RunEntry, RunState } from './run.type.ts';

/** The dependency ids of a task in one run, snapshotted at run start (spec D10); `[]` for an id the snapshot lacks. */
export type DependenciesOf = (taskId: string) => string[];

/** The run that recorded the progress: its root, launched task and launch token. */
export type ProgressOwner = {
  readonly root: string;
  readonly taskId: string;
  readonly launchedAt: number;
};

export type ProgressState = 'running' | 'passed' | 'failed' | 'stopped';

/** What one task did inside an owner run; `at` is the wall-clock ms of the last change: the event time, or the owner's `endedAt` at settle. */
export type ProgressRecord = {
  readonly owner: ProgressOwner;
  readonly taskId: string;
  readonly state: ProgressState;
  readonly at: number;
};

/** One owner run; records by task id, never the owner's own id (spec D8); `settled` once the summary or the run's end settled it. */
export type ProgressRun = {
  readonly owner: ProgressOwner;
  readonly dependenciesOf: DependenciesOf;
  readonly records: ReadonlyMap<string, ProgressRecord>;
  readonly settled: boolean;
};

/** One log line of the run, read at wall-clock `at`. */
export type ProgressEventInput = {
  readonly kind: 'event';
  readonly event: RunLogEvent;
  readonly at: number;
};

/** The owner's entry, once its summary or its end settled it. */
export type ProgressSettleInput = {
  readonly kind: 'settle';
  readonly entry: RunEntry;
};

export type ProgressInput = ProgressEventInput | ProgressSettleInput;

/** The run state one task id shows (spec D9); `owner` is the task id of the run that runs this id while the task's own run does not, else `null`. The graph maps the word to its `GraphRunState`. */
export type DisplayedRun = {
  readonly state: RunState;
  readonly owner: string | null;
};

/** Called with the root of the runs whose records changed. */
export type ProgressListener = (root: string) => void;

/** The change feed of the task progress; `onDidChange` returns the unsubscribe. */
export type ProgressChanges = {
  readonly onDidChange: (listener: ProgressListener) => () => void;
};
