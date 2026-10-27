import * as nodePath from 'node:path';

import type { ZodMiniType } from 'zod/mini';

// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import this rule asks for.
import type { TurboBinary } from '../../binary/common/index.ts';
import { ROOT_KEYED_FILES } from '../../cache/common/cache.const.ts';
import type { KeyedFile, SpawnMark } from '../../cache/common/cache.type.ts';
import { hashKeyedFiles } from '../../cache/data-access/keyed-files.ts';
import { storeWorkspace } from '../../cache/data-access/store-workspace.ts';
import { hostileRootFile } from '../../cache/utils/cache-key.util.ts';
import { keyedFileCapOf } from '../../cache/utils/keyed-file-cap.util.ts';
import { TurboException } from '../../shared/errors/common/turbo.exception.ts';
import { toTurboException } from '../../shared/errors/utils/turbo-error.util.ts';
import { plainPath } from '../../shared/errors/utils/turbo-message.util.ts';
import { absolutePath } from '../../shared/fs/utils/input-path.util.ts';
import { packageGraphSchema } from '../../shared/turbo/common/package-graph.schema.ts';
import { TURBO_BUDGET_MS } from '../../shared/turbo/common/turbo-budget.const.ts';
import { PACKAGE_GRAPH_QUERY } from '../../shared/turbo/common/turbo-query.const.ts';
import type { GraphPackage, PackageGraph, QueryTurboOptions, TurboResult } from '../../shared/turbo/common/turbo.type.ts';
import { lazyCompiled } from '../../shared/turbo/data-access/compiled-schema.ts';
import { queryTurbo } from '../../shared/turbo/data-access/query-turbo.ts';
import { abortError } from '../../shared/turbo/data-access/run-turbo.ts';
import { runTurboJson } from '../../shared/turbo/data-access/turbo-json.ts';
import { untilAborted } from '../../shared/turbo/data-access/until-aborted.ts';
import { toPosixPath } from '../../shared/turbo/utils/posix-path.util.ts';
import type { LoadWorkspaceOptions } from '../common/load-workspace.type.ts';
import type { DetectedRoot } from '../common/manifest-fields.type.ts';
import type { TurboConfigFile } from '../common/turbo-config.type.ts';
import type { ModelSource, WorkspaceModel } from '../common/workspace-model.type.ts';
import { hasPnpmWorkspacePackages } from '../data-access/pnpm-workspace.ts';
import { detectPackageManager } from '../data-access/root-manifest.ts';
import { readTurboConfigs } from '../data-access/turbo-config.ts';
import { rootLabelOf } from '../utils/root-label.util.ts';
import { declaresWorkspaces, singlePackageGraphOf } from '../utils/single-package.util.ts';
import { buildWorkspaceModel, withWarning } from '../utils/workspace-model.util.ts';

const COMMAND = 'query packageGraph';

const compiledGraphSchema = lazyCompiled(packageGraphSchema);

/** `stretch-300` prints ~10 MB; `runTurbo`'s 256 MiB default can cost gigabytes of heap once parsed. */
const QUERY_MAX_BUFFER = 128 * 1024 * 1024;

const MIB = 1024 * 1024;

const configDirOf = (pkg: GraphPackage): string => toPosixPath(pkg.path);

/** `cacheDir` resolved, or `undefined` when none is given; an empty, relative or driveless one throws `invalid-argument`. */
const cacheDirOf = (cacheDir: string | undefined): string | undefined => {
  if (cacheDir === undefined) return undefined;

  return absolutePath(cacheDir, 'cacheDir', nodePath);
};

/**
 * Throws `io` naming the file and its own byte cap when a root keyed file is no regular file or is over that cap: turbo
 * would read it with no cap.
 */
const refuseHostile = (rootFiles: KeyedFile[]): void => {
  const hostile = hostileRootFile(rootFiles);

  if (hostile === undefined) return;

  const capMib = keyedFileCapOf(hostile.path) / MIB;

  throw new TurboException(
    'io',
    `root keyed file ${plainPath(hostile.path)} is not a regular file of at most ${capMib} MiB; turbo is not run`
  );
};

/** The facts of the load the model build reads besides the graph; the label only for a single-package repo. */
const sourceOf = (binary: TurboBinary, detected: DetectedRoot, isSingle: boolean): ModelSource => {
  const { packageManager, name } = detected;
  const label = rootLabelOf(name, binary.root);
  const rootLabel = isSingle ? label : null;
  const source: ModelSource = {
    turboVersion: binary.version,
    root: binary.root,
    packageManager,
    singlePackage: isSingle,
    rootLabel
  };

  return source;
};

/**
 * Whether the repo is single-package (spec §1, §4.1): an empty `nodes`, a `root` package and no declared workspaces.
 * A file rule, never a spawn: the pnpm workspace file is read only for pnpm and only on an empty graph.
 */
const modeOf = async (graph: PackageGraph, detected: DetectedRoot, root: string, signal?: AbortSignal): Promise<boolean> => {
  const isEmpty = graph.data.packageGraph.nodes.items.length === 0;

  if (!isEmpty || graph.data.root === null) return false;

  const { packageManager, workspaces } = detected;
  const manager = packageManager.name;
  const pnpmPackages = manager === 'pnpm' && (await hasPnpmWorkspacePackages(root, signal));

  return !declaresWorkspaces(manager, workspaces, pnpmPackages);
};

/**
 * The graph of a single-package repo: a second `packageGraph` spawn with `--single-package`, the only mode in which turbo
 * gives the `//` tasks their dependencies; the first spawn stays in monorepo mode to decide the mode.
 */
const singleGraphOf = async (
  binary: TurboBinary,
  queryOptions: QueryTurboOptions,
  graphSchema: ZodMiniType<PackageGraph>
): Promise<PackageGraph> => {
  const options = { ...queryOptions, singlePackage: true };
  const run = async (): Promise<TurboResult> => queryTurbo(binary.path, PACKAGE_GRAPH_QUERY, binary.root, options);
  const graph = await runTurboJson(run, COMMAND, graphSchema);

  return singlePackageGraphOf(graph);
};

/**
 * Spec §4.4: one `packageGraph` spawn (30 s budget, 128 MiB stdout cap), two in a single-package repo (up to 60 s), the
 * `packageManager` field, `devEngines.packageManager`, `name` and `workspaces` of the root `package.json`, read once after the root hash (a
 * missing, oversized or malformed one never fails the load: the root lockfiles in that hash decide), the `turbo.json(c)`
 * of the root and of every graph package (hidden ones included), the pure model build, then the model keyed and kept in
 * memory, and written to `cacheDir` when one is given. The mode is a file rule, never a spawn (`modeOf`): an empty
 * graph, a non-null `root` and no declared workspaces make a single-package model of the `//` package, labelled from
 * the manifest `name`; `pnpm-workspace.yaml` is read only for pnpm and only on an empty graph, a failed read rejects
 * `io` and an abort rejects `failed`. A failed write does not fail the load: the returned model, and only it, gains a
 * `cache: <message>` warning under the usual cut, sort and cap. The caller gets its own copy of the model: changing it
 * changes nothing the cache holds. The caller's `signal` reaches the root keyed file hash, the spawn and the reads, and
 * is checked once more before the store: an abort by then stores nothing, one during the store does not stop it. The
 * root keyed files are hashed before the spawn and again at the store, so a root keyed file (`ROOT_KEYED_FILES`) edited
 * or deleted meanwhile caches the model under a `null` key, never fresh. Rejects with `TurboException` only:
 * `invalid-argument` (a `cacheDir` that is empty, relative or, on Windows, driveless, checked before the spawn),
 * `failed` (turbo exits non-zero, times out, overflows the stdout cap, or the caller aborts), `invalid-output` (stdout
 * is not JSON or breaks `packageGraphSchema`), `io` (a root keyed file is no regular file or is over its byte cap,
 * 64 MiB for a lockfile and 4 MiB for any other, checked before the spawn, which then never runs, unless the caller
 * aborted first; the root is missing, not a directory or not searchable, so `checkCwd` refuses the spawn; or a config
 * cannot be read), or `not-found` (the binary is no longer runnable).
 */
export const loadWorkspace = async (binary: TurboBinary, options: LoadWorkspaceOptions = {}): Promise<WorkspaceModel> => {
  const { cacheDir, signal } = options;
  const queryOptions = { timeoutMs: TURBO_BUDGET_MS.query, signal, maxBuffer: QUERY_MAX_BUFFER };
  const run = async (): Promise<TurboResult> => queryTurbo(binary.path, PACKAGE_GRAPH_QUERY, binary.root, queryOptions);
  const spawnStartedAt = Date.now();

  try {
    const dir = cacheDirOf(cacheDir);
    const hashRootFiles = async (): Promise<KeyedFile[]> => hashKeyedFiles(binary.root, ROOT_KEYED_FILES);
    const rootFiles = await untilAborted(hashRootFiles, signal);

    refuseHostile(rootFiles);

    const detect = async (): Promise<DetectedRoot> => detectPackageManager(binary.root, rootFiles);
    const detected = await untilAborted(detect, signal);
    const mark: SpawnMark = { startedAt: spawnStartedAt, rootFiles };
    const graphSchema = compiledGraphSchema();
    const graph = await runTurboJson(run, COMMAND, graphSchema);
    const packages = graph.data.packageGraph.nodes.items;
    const isSingle = await modeOf(graph, detected, binary.root, signal);
    let modelGraph = graph;

    if (isSingle) modelGraph = await singleGraphOf(binary, queryOptions, graphSchema);

    const dirs = packages.map(configDirOf);
    const readConfigs = async (): Promise<TurboConfigFile[]> => readTurboConfigs(binary.root, dirs, signal);
    const configs = await untilAborted(readConfigs, signal);
    const source = sourceOf(binary, detected, isSingle);
    const model = buildWorkspaceModel(modelGraph, configs, source);

    if (signal?.aborted === true) throw abortError(signal, '');

    const writeError = await storeWorkspace(model, modelGraph.data.packageGraph.nodes.items, mark, dir);
    const ownModel = structuredClone(model);

    if (writeError === null) return ownModel;

    return withWarning(ownModel, modelGraph, configs, `cache: ${writeError}`);
  } catch (error) {
    throw toTurboException(error, COMMAND);
  }
};
