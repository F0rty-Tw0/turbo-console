import { CACHE_HIT_PATTERN } from '../common/run-log.const.ts';
import type { CacheHitEvent, RunLogEntry, RunLogEvent, SeenEvent } from '../common/run-log.type.ts';

/** Task output carries the task id (`<package>#<task>`) as its source; turbo's own lines use the source `turbo`. */
export const runLogEventOf = (entry: RunLogEntry): RunLogEvent | null => {
  const taskId = entry.source;
  const isTask = taskId.includes('#');

  if (!isTask) return null;

  const isCacheHit = CACHE_HIT_PATTERN.test(entry.text);

  if (isCacheHit) {
    const cacheHit: CacheHitEvent = { kind: 'cacheHit', taskId };

    return cacheHit;
  }

  const seen: SeenEvent = { kind: 'seen', taskId };

  return seen;
};
