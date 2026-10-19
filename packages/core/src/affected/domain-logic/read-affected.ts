// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import this rule asks for.
import type { TurboBinary } from '../../binary/common/index.ts';
import { toTurboException } from '../../shared/errors/utils/turbo-error.util.ts';
import { affectedTasksSchema } from '../../shared/turbo/common/affected-tasks.schema.ts';
import { TURBO_BUDGET_MS } from '../../shared/turbo/common/turbo-budget.const.ts';
import { AFFECTED_TASKS_QUERY } from '../../shared/turbo/common/turbo-query.const.ts';
import type { QueryTurboOptions, TurboResult } from '../../shared/turbo/common/turbo.type.ts';
import { lazyCompiled } from '../../shared/turbo/data-access/compiled-schema.ts';
import { queryTurbo } from '../../shared/turbo/data-access/query-turbo.ts';
import { runTurboJson } from '../../shared/turbo/data-access/turbo-json.ts';
import { readTurboConfig } from '../../workspace/data-access/turbo-config.ts';
import { affectedModeOf } from '../../workspace/utils/task-description.util.ts';
import type { AffectedResult, ReadAffectedOptions } from '../common/affected.type.ts';
import { affectedVariables, toAffectedResult } from '../utils/affected.util.ts';

const COMMAND = 'query affectedTasks';

const compiledAffectedSchema = lazyCompiled(affectedTasksSchema);

/**
 * Spec §4.7: one `affectedTasks` query spawn (30 s budget), `base` and `head` passed through `-V` only when set, then
 * the mode read from the root `turbo.json(c)` (an unparsable one reads as `'package'`). Tasks are turbo's own, sorted by
 * id. Rejects with `TurboException` only: `invalid-argument` (a ref turbo could misread, checked before the spawn),
 * `failed` (turbo exits non-zero, for one on a root config it cannot parse, times out or the caller aborts),
 * `invalid-output` (stdout is not JSON or breaks `affectedTasksSchema`), `io` (the root cannot be searched, or its
 * config cannot be read), or `not-found` (the binary is no longer runnable).
 */
export const readAffected = async (binary: TurboBinary, options: ReadAffectedOptions = {}): Promise<AffectedResult> => {
  try {
    const variables = affectedVariables(options);
    const queryOptions: QueryTurboOptions = { variables, timeoutMs: TURBO_BUDGET_MS.query, signal: options.signal };
    const run = async (): Promise<TurboResult> => queryTurbo(binary.path, AFFECTED_TASKS_QUERY, binary.root, queryOptions);
    const schema = compiledAffectedSchema();
    const json = await runTurboJson(run, COMMAND, schema);
    const rootConfig = await readTurboConfig(binary.root, '');
    const mode = affectedModeOf(rootConfig);

    return toAffectedResult(json, mode);
  } catch (error) {
    throw toTurboException(error, COMMAND);
  }
};
