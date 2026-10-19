// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import this rule asks for.
import type { TurboBinary } from '../../binary/common/index.ts';
import { toTurboException } from '../../shared/errors/utils/turbo-error.util.ts';
import { dryRunSchema } from '../../shared/turbo/common/dry-run.schema.ts';
import { TURBO_BUDGET_MS } from '../../shared/turbo/common/turbo-budget.const.ts';
import type { RunTurboOptions, TurboResult } from '../../shared/turbo/common/turbo.type.ts';
import { lazyCompiled } from '../../shared/turbo/data-access/compiled-schema.ts';
import { runTurbo } from '../../shared/turbo/data-access/run-turbo.ts';
import { runTurboJson } from '../../shared/turbo/data-access/turbo-json.ts';
import type { DryRunRequest, DryRunState, ReadDryRunOptions } from '../common/dry-run-state.type.ts';
import { dryRunArgs, toDryRunStates } from '../utils/dry-run.util.ts';

const COMMAND = 'run --dry=json';

const compiledDryRunSchema = lazyCompiled(dryRunSchema);

/**
 * Spec §4.7: one `run <tasks…> [--filter=<pkg>…] --dry=json` spawn (60 s budget). Tasks with no command are dropped, a
 * `null` hash reads as `'deferred'`, and the states are sorted by id, not filtered against the model. Rejects with
 * `TurboException` only: `invalid-argument` (no task, or a task or package name turbo could misread, checked before
 * any spawn), `failed` (turbo exits non-zero, times out or the caller aborts), `invalid-output` (stdout is not JSON or
 * breaks `dryRunSchema`), `io` (the root cannot be searched), or `not-found` (the binary is no longer runnable).
 */
export const readDryRun = async (
  binary: TurboBinary,
  request: DryRunRequest,
  options: ReadDryRunOptions = {}
): Promise<DryRunState[]> => {
  const runOptions: RunTurboOptions = { timeoutMs: TURBO_BUDGET_MS.dryRun, signal: options.signal };

  try {
    const args = dryRunArgs(request);
    const run = async (): Promise<TurboResult> => runTurbo(binary.path, args, binary.root, runOptions);
    const schema = compiledDryRunSchema();
    const json = await runTurboJson(run, COMMAND, schema);

    return toDryRunStates(json);
  } catch (error) {
    throw toTurboException(error, COMMAND);
  }
};
