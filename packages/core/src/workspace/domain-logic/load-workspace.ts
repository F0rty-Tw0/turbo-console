// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import this rule asks for.
import type { TurboBinary } from '../../binary/common/index.ts';
import { toTurboException } from '../../shared/errors/utils/turbo-error.util.ts';
import { packageGraphSchema } from '../../shared/turbo/common/package-graph.schema.ts';
import { TURBO_BUDGET_MS } from '../../shared/turbo/common/turbo-budget.const.ts';
import { PACKAGE_GRAPH_QUERY } from '../../shared/turbo/common/turbo-query.const.ts';
import type { GraphPackage, TurboResult } from '../../shared/turbo/common/turbo.type.ts';
import { queryTurbo } from '../../shared/turbo/data-access/query-turbo.ts';
import { abortError } from '../../shared/turbo/data-access/run-turbo.ts';
import { runTurboJson } from '../../shared/turbo/data-access/turbo-json.ts';
import { toPosixPath } from '../../shared/turbo/utils/posix-path.util.ts';
import type { LoadWorkspaceOptions } from '../common/load-workspace.type.ts';
import type { TurboConfigFile } from '../common/turbo-config.type.ts';
import type { WorkspaceModel } from '../common/workspace-model.type.ts';
import { readTurboConfigs } from '../data-access/turbo-config.ts';
import { buildWorkspaceModel } from '../utils/workspace-model.util.ts';

const COMMAND = 'query packageGraph';

/** `stretch-300` prints ~10 MB; `runTurbo`'s 256 MiB default can cost gigabytes of heap once parsed. */
const QUERY_MAX_BUFFER = 128 * 1024 * 1024;

const configDirOf = (pkg: GraphPackage): string => toPosixPath(pkg.path);

/**
 * `start()`'s result, unless `signal` aborts first: then `runTurbo`'s `AbortError`. Not started when `signal` already
 * aborted; an abort while it runs rejects at once, so reads hung on a slow filesystem cannot hold it back (they are
 * left to finish). The abort listener is removed either way.
 */
const untilAborted = async (start: () => Promise<TurboConfigFile[]>, signal: AbortSignal | undefined): Promise<TurboConfigFile[]> => {
  if (signal === undefined) return start();

  if (signal.aborted) throw abortError(signal, '');

  const { promise: aborted, reject } = Promise.withResolvers<never>();
  const onAbort = (): void => reject(abortError(signal, ''));

  signal.addEventListener('abort', onAbort, { once: true });

  try {
    return await Promise.race([start(), aborted]);
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
};

/**
 * Spec §4.4 steps 2–4: one `packageGraph` spawn (30 s budget, 128 MiB stdout cap), the `turbo.json(c)` of the root and
 * of every graph package (hidden ones included), then the pure model build. The caller's `signal` reaches the spawn
 * and the reads. Rejects with `TurboException` only: `failed` (turbo exits non-zero, times out, overflows the stdout
 * cap, or the caller aborts), `invalid-output` (stdout is not JSON or breaks `packageGraphSchema`), `io` (the root is
 * missing, not a directory or not searchable, so `checkCwd` refuses the spawn, or a config cannot be read), or
 * `not-found` (the binary is no longer runnable).
 */
export const loadWorkspace = async (binary: TurboBinary, options: LoadWorkspaceOptions = {}): Promise<WorkspaceModel> => {
  const { signal } = options;
  const queryOptions = { timeoutMs: TURBO_BUDGET_MS.query, signal, maxBuffer: QUERY_MAX_BUFFER };
  const run = async (): Promise<TurboResult> => queryTurbo(binary.path, PACKAGE_GRAPH_QUERY, binary.root, queryOptions);

  try {
    const graph = await runTurboJson(run, COMMAND, packageGraphSchema);
    const dirs = graph.data.packageGraph.nodes.items.map(configDirOf);
    const readConfigs = async (): Promise<TurboConfigFile[]> => readTurboConfigs(binary.root, dirs, signal);
    const configs = await untilAborted(readConfigs, signal);

    return buildWorkspaceModel(graph, configs, binary.version, binary.root);
  } catch (error) {
    throw toTurboException(error, COMMAND);
  }
};
