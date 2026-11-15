import { isRealDuration, outcomeOf } from './run-match.util.ts';
import type { RunSummaryTask } from '../../shared/turbo/common/turbo.type.ts';
import type { AtomResult } from '../common/atom-result.type.ts';

/** What `entry` says about its file task. `durationMs` is `null` when the span is not a real duration. */
export const atomResultOf = (entry: RunSummaryTask): AtomResult => {
  const { startTime, endTime } = entry.execution;
  const span = endTime - startTime;
  const durationMs = isRealDuration(span) ? span : null;
  const result: AtomResult = { outcome: outcomeOf(entry), durationMs, endedAt: endTime };

  return result;
};

/** `atomResultOf` every entry of `tasks` by `taskId`, in their order; the first entry of a repeated id wins. */
export const atomResultsOf = (tasks: RunSummaryTask[]): Map<string, AtomResult> => {
  const results = new Map<string, AtomResult>();

  for (const entry of tasks) {
    const isKnown = results.has(entry.taskId);

    if (!isKnown) results.set(entry.taskId, atomResultOf(entry));
  }

  return results;
};
