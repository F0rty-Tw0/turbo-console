import { newestRunNames } from './newest-run-names.ts';
import type { RunMatch, RunToMatch } from '../common/run-match.type.ts';
import type { RunSummaryFile } from '../common/run-summary-file.type.ts';
import { readRunSummaryFile } from '../data-access/run-summary-files.ts';
import { isNearRun, matchSummary } from '../utils/run-match.util.ts';

/** The data the summary file `name` gives `run`; `null` when it cannot be read or parsed, or does not fit. */
const matchFile = async (root: string, name: string, run: RunToMatch): Promise<RunMatch | null> => {
  const summary = await readRunSummaryFile(root, name);

  if (summary === null) return null;

  return matchSummary(summary, run);
};

/**
 * Spec §4.1.2: what the run summary of exactly `run` says (cache status and duration). Only the newest
 * `MAX_SUMMARY_TRIES` files of `<root>/.turbo/runs` written near the run (`isNearRun`) are tried, one at a time, so at
 * most one parsed summary is held; files that cannot be read or parsed are dropped. `null` when no summary or more than
 * one fits `run`, or there is no runs directory. No spawn. Rejects with `TurboException` `io` when the directory or a
 * file in it exists but cannot be resolved, listed or stat'ed.
 */
export const matchRunSummary = async (root: string, run: RunToMatch): Promise<RunMatch | null> => {
  const isNear = (file: RunSummaryFile): boolean => isNearRun(file, run);
  const names = await newestRunNames(root, isNear);

  if (names === null) return null;

  let found: RunMatch | null = null;

  for (const name of names) {
    const match = await matchFile(root, name, run);

    if (match === null) continue;

    if (found !== null) return null;

    found = match;
  }

  return found;
};
