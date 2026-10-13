import { compareText } from '../../shared/text/utils/compare-text.util.ts';
import type { AffectedTasks } from '../../shared/turbo/common/turbo.type.ts';
import { assertTurboName } from '../../shared/turbo/utils/turbo-name.util.ts';
import type { AffectedMode } from '../../workspace/common/workspace-model.type.ts';
import type { AffectedResult, AffectedTask, ReadAffectedOptions } from '../common/affected.type.ts';

type ChangedTask = AffectedTasks['data']['affectedTasks']['items'][number];

const compareIds = (left: AffectedTask, right: AffectedTask): number => compareText(left.id, right.id);

const toAffectedTask = (item: ChangedTask): AffectedTask => {
  // eslint-disable-next-line no-underscore-dangle -- GraphQL's own __typename key, copied from turbo's output.
  const reason = item.reason.__typename;
  const task: AffectedTask = { id: item.fullName, reason };

  return task;
};

/** turbo's affected tasks as `{ id, reason }`, sorted by id, with the `mode` read from the root config. */
export const toAffectedResult = (json: AffectedTasks, mode: AffectedMode): AffectedResult => {
  const changed = json.data.affectedTasks.items;
  const tasks = changed.map(toAffectedTask);
  const sorted = tasks.toSorted(compareIds);
  const result: AffectedResult = { mode, tasks: sorted };

  return result;
};

/**
 * The refs that are set, as `AFFECTED_TASKS_QUERY` variables; `undefined` when neither is, so no `-V` file is written.
 * A ref `assertTurboName` rejects (empty, starting with `-`, holding a control character) throws `invalid-argument`.
 */
export const affectedVariables = (options: ReadAffectedOptions): Record<string, string> | undefined => {
  const entries: [string, string][] = [];

  if (options.base !== undefined) entries.push(['base', options.base]);

  if (options.head !== undefined) entries.push(['head', options.head]);

  for (const [, ref] of entries) assertTurboName(ref);

  if (entries.length === 0) return undefined;

  return Object.fromEntries(entries);
};
