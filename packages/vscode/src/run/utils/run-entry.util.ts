import type { RunEntry, RunKey, RunRequest } from '../common/run.type.ts';

export const runKeyOf = (root: string, taskId: string): RunKey => `${root}\0${taskId}`;

/** The entry of a run of `request` launched at `now`, before anything about its process is known. */
export const runningEntryOf = (request: RunRequest, now: number): RunEntry => {
  const entry: RunEntry = {
    root: request.root,
    taskId: request.task.id,
    packageName: request.packageName,
    task: request.task,
    state: 'running',
    launchedAt: now,
    processStartedAt: null,
    endedAt: null,
    exitCode: null,
    stopRequested: false,
    match: null,
    matching: false,
    force: request.force
  };

  return entry;
};
