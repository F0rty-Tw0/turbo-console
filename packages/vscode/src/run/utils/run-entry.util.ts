import type { RunEntry, RunKey, RunRequest } from '../common/run.type.ts';

export const runKeyOf = (root: string, taskId: string): RunKey => `${root}\0${taskId}`;

/** The process a run starts: its package manager for a script, `turbo` for a turbo task or no run at all. */
export const processNameOf = (entry: RunEntry | null | undefined): string => entry?.packageManager?.name ?? 'turbo';

/**
 * The entry of a run of `request` launched at `now`, before anything about its process is known. A script run keeps
 * its package manager, a turbo run none.
 */
export const runningEntryOf = (request: RunRequest, now: number): RunEntry => {
  const packageManager = request.task.isTurboTask ? null : request.packageManager;
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
    force: request.force,
    packageManager
  };

  return entry;
};
