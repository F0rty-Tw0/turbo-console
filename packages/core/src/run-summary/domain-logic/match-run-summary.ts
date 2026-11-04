import { matchRunTasks } from './match-run-tasks.ts';
import type { RunMatch, RunToMatch } from '../common/run-match.type.ts';

/**
 * Spec §4.1.2: what the run summary of exactly `run` says (cache status and duration): the `match` of `matchRunTasks`,
 * with the same results and the same `io` rejection. `null` when no summary or more than one fits `run`, or there is no
 * runs directory.
 */
export const matchRunSummary = async (root: string, run: RunToMatch): Promise<RunMatch | null> => {
  const tasks = await matchRunTasks(root, run);

  return tasks?.match ?? null;
};
