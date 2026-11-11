import type { GraphAffected, GraphAffectedMark } from '../../bridge/common/graph-affected.type.ts';
import { AFFECTED_MARKS, TASK_COUNT_MAX } from '../../bridge/common/graph-message.const.ts';
import { isRecord } from '../../bridge/utils/record.util.ts';

const isMarkEntry = (entry: [string, unknown]): entry is [string, GraphAffectedMark] => {
  const [, word] = entry;

  return AFFECTED_MARKS.some((known) => known === word);
};

const isModeWord = (value: unknown): value is GraphAffected['mode'] => value === 'task' || value === 'package';

const marksOf = (value: unknown): GraphAffected['tasks'] | undefined => {
  const isObject = isRecord(value);
  const isList = Array.isArray(value);

  if (!isObject || isList) return undefined;

  const entries = Object.entries(value);
  const isTooMany = entries.length > TASK_COUNT_MAX;

  if (isTooMany) return undefined;

  const known = entries.filter(isMarkEntry);

  return Object.fromEntries(known);
};

/**
 * The `affected` of a `runs` message as the page trusts it: `undefined` while the key is absent, as the host leaves it off while
 * the marks did not change, and for a malformed value (not a plain object, an unknown `mode`, `tasks` that are not a plain
 * object or hold more than `TASK_COUNT_MAX` entries), so the marks stay; `null` clears every mark; an entry whose word is
 * unknown is dropped. Built from own entries, so a `__proto__` key stays plain data.
 */
export const affectedUpdateOf = (value: unknown): GraphAffected | null | undefined => {
  if (value === null) return null;

  const isObject = isRecord(value);
  const isList = Array.isArray(value);

  if (!isObject || isList) return undefined;

  const mode = value['mode'];
  const tasks = marksOf(value['tasks']);

  if (!isModeWord(mode) || tasks === undefined) return undefined;

  const update: GraphAffected = { mode, tasks };

  return update;
};
