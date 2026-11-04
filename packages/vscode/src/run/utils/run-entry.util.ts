import type { ProgressOwner } from '../common/run-progress.type.ts';
import type { RunEntry, RunKey, RunRequest } from '../common/run.type.ts';

export const runKeyOf = (root: string, taskId: string): RunKey => `${root}\0${taskId}`;

/** One key per launch of a task: two runs of one task get two keys. */
export const progressKeyOf = (owner: ProgressOwner): string => `${runKeyOf(owner.root, owner.taskId)}\0${owner.launchedAt}`;

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
    outcomes: null,
    force: request.force,
    packageManager
  };

  return entry;
};
