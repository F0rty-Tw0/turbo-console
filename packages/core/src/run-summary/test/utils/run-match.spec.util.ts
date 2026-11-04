import type { RunMatch, RunTasksMatch } from '../../common/run-match.type.ts';

/** The `match` of a `matchRunTasks` result: its cache status and duration, or `null` when no summary fits the run. */
export const runMatchOf = (tasksMatch: RunTasksMatch | null): RunMatch | null => tasksMatch?.match ?? null;
