import type { AffectedResult } from '@turbo-console/core';

import type { AffectedMode } from '../../common/affected.type.ts';

type AffectedRowInput = [id: string, reason: string, detail?: string | null];

/** A turbo affected result of the given `[id, reason, detail]` rows; `detail` defaults to `null`, `mode` to `task`. */
export const affectedResultOf = (rows: AffectedRowInput[], mode: AffectedMode = 'task'): AffectedResult => {
  const tasks = rows.map(([id, reason, detail = null]): AffectedResult['tasks'][number] => {
    const row = { id, reason, detail };

    return row;
  });
  const result: AffectedResult = { mode, tasks };

  return result;
};
