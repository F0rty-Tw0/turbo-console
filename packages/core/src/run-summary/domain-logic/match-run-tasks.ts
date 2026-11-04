import { newestRunNames } from './newest-run-names.ts';
import type { RunTasksMatch, RunToMatch } from '../common/run-match.type.ts';
import type { RunSummaryFile } from '../common/run-summary-file.type.ts';
import { readRunSummaryFile } from '../data-access/run-summary-files.ts';
import { isNearRun, summaryCandidateOf } from '../utils/run-match.util.ts';

/**
 * Spec §4.1.2 and D7: what the run summary of exactly `run` says: its `match` (cache status and duration, as
 * `matchSummary` gives it) and the `outcomes` of every task it lists. Only the newest `MAX_SUMMARY_TRIES` files of
 * `<root>/.turbo/runs` written near the run (`isNearRun`) are tried, one at a time, so at most the summary being read,
 * the outcomes of the fitting one and those of one that does not fit are held (a second that does not fit drops the
 * first); files that cannot be read or parsed are dropped. The one fitting summary is the answer; with none, the one candidate that lacks
 * the launched task's entry (its dependency failed) gives `{ match: null, outcomes }`. `null` when there is no runs
 * directory, no candidate, two fitting candidates, or no fitting one and two or more that do not fit. No spawn.
 * Rejects with `TurboException` `io` when the directory or a file in it exists but cannot be resolved, listed or stat'ed.
 */
export const matchRunTasks = async (root: string, run: RunToMatch): Promise<RunTasksMatch | null> => {
  const isNear = (file: RunSummaryFile): boolean => isNearRun(file, run);
  const names = await newestRunNames(root, isNear);

  if (names === null) return null;

  let fit: RunTasksMatch | null = null;
  let spare: RunTasksMatch | null = null;
  let spareCount = 0;

  for (const name of names) {
    const summary = await readRunSummaryFile(root, name);

    if (summary === null) continue;

    const candidate = summaryCandidateOf(summary, run);

    if (candidate === null) continue;

    const isFit = candidate.match !== null;

    if (isFit && fit !== null) return null;

    if (isFit) {
      fit = candidate;
      continue;
    }

    spareCount += 1;
    spare = spareCount === 1 ? candidate : null;
  }

  const tasksMatch = fit ?? spare;

  return tasksMatch;
};
