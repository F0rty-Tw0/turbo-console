import type { RunToMatch } from '@turbo-console/core';

import type { RunEntry, RunState } from '../common/run.type.ts';

/**
 * Spec 1c-a §4.3: Stop wins whatever the code (turbo may exit non-zero on the hang-up). A continuous task (`persistent`,
 * read from the node the run was launched with) ended by Ctrl+C (exit 0) or a killed terminal (no exit code) was
 * stopped by the user, never failed; any other task with no exit code failed.
 */
export const endStateOf = (stopRequested: boolean, exitCode: number | undefined, persistent: boolean): RunState => {
  if (stopRequested) return 'stopped';

  const isUserEnd = exitCode === 0 || exitCode === undefined;

  if (persistent && isUserEnd) return 'stopped';

  return exitCode === 0 ? 'passed' : 'failed';
};

/** Only a passed or failed run with a numeric exit code has a run summary to match. */
export const isMatchedEnd = (state: RunState, exitCode: number | undefined): boolean => {
  const isFinished = state === 'passed' || state === 'failed';

  return isFinished && exitCode !== undefined;
};

/** What `matchRunSummary` needs of an ended entry; `null` while its end time or exit code is unknown. */
export const runToMatchOf = (entry: RunEntry): RunToMatch | null => {
  const { endedAt, exitCode } = entry;

  if (endedAt === null) return null;

  if (exitCode === null) return null;

  const run: RunToMatch = { task: entry.task, packageName: entry.packageName, launchedAt: entry.launchedAt, endedAt, exitCode };

  return run;
};
