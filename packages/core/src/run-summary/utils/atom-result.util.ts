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
