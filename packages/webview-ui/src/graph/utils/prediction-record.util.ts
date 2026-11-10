import { PREDICTION_WORDS, TASK_COUNT_MAX } from '../../bridge/common/graph-message.const.ts';
import type { GraphPrediction } from '../../bridge/common/graph-message.type.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';
import { NO_PREDICTIONS } from '../common/graph-task.const.ts';
import type { TaskPredictions } from '../common/task-canvas.type.ts';

const isPredictionEntry = (entry: [string, unknown]): entry is [string, GraphPrediction] => {
  const [, word] = entry;

  return PREDICTION_WORDS.some((known) => known === word);
};

/**
 * The `predictions` of a `runs` message as the page trusts it: `null` while the key is absent, as the host leaves it off while
 * they did not change, so the marks stay; a value that is not a plain object, or one with more than `TASK_COUNT_MAX` entries, is
 * the empty record, which clears every mark; an entry whose word is unknown is dropped. Built from own entries, so a `__proto__`
 * key stays plain data.
 */
export const predictionRecordOf = (value: unknown): TaskPredictions | null => {
  if (value === undefined) return null;

  const isObject = isRecord(value);
  const isList = Array.isArray(value);

  if (!isObject || isList) return NO_PREDICTIONS;

  const entries = Object.entries(value);
  const isTooMany = entries.length > TASK_COUNT_MAX;

  if (isTooMany) return NO_PREDICTIONS;

  const known = entries.filter(isPredictionEntry);

  return Object.fromEntries(known);
};
