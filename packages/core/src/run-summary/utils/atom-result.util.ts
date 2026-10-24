import { isRealDuration } from './run-match.util.ts';
import type { RunSummary } from '../../shared/turbo/common/turbo.type.ts';
import type { AtomResult } from '../common/atom-result.type.ts';

type TaskEntry = RunSummary['tasks'][number];

/** A cache HIT is `cached` whatever the recorded exit code; otherwise exit 0 is `passed` and anything else `failed`. */
const outcomeOf = (entry: TaskEntry): AtomResult['outcome'] => {
  if (entry.cache.status === 'HIT') return 'cached';

  return entry.execution.exitCode === 0 ? 'passed' : 'failed';
};

/** What `entry` says about its file task. `durationMs` is `null` when the span is not a real duration. */
export const atomResultOf = (entry: TaskEntry): AtomResult => {
  const { startTime, endTime } = entry.execution;
  const span = endTime - startTime;
  const durationMs = isRealDuration(span) ? span : null;
  const result: AtomResult = { outcome: outcomeOf(entry), durationMs, endedAt: endTime };

  return result;
};
