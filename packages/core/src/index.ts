/** npm name of this package. */
export const PACKAGE_NAME = '@turbo-console/core';

export type { AffectedResult } from './affected/common/affected.type.ts';

export { readAffected } from './affected/domain-logic/read-affected.ts';

export { resolveTurbo } from './binary/domain-logic/resolve-turbo.ts';

// eslint-disable-next-line import-x/no-useless-path-segments -- nodenext type resolution rejects the directory import this rule asks for.
export type { TurboBinary } from './binary/common/index.ts';

export type { CachedWorkspace } from './cache/common/cache.type.ts';

export { readCachedWorkspace } from './cache/domain-logic/read-cached-workspace.ts';

export type { DryRunRequest, DryRunState, TaskDefinition } from './dry-run/common/dry-run-state.type.ts';

export { readDryRun } from './dry-run/domain-logic/read-dry-run.ts';

export type { AtomResult } from './run-summary/common/atom-result.type.ts';

export type { RunMatch, RunToMatch } from './run-summary/common/run-match.type.ts';

export { matchRunSummary } from './run-summary/domain-logic/match-run-summary.ts';

export { readNewestRunSummary } from './run-summary/domain-logic/read-newest-run-summary.ts';

export { readAtomResults } from './run-summary/domain-logic/read-atom-results.ts';

export { readSmallFile } from './shared/fs/data-access/small-file.ts';

export type { RunAllOptions, RunTaskOptions } from './run-args/common/run-args.type.ts';

export { turboRunAllArgs, turboRunArgs } from './run-args/utils/run-args.util.ts';

export { SINGLE_PACKAGE } from './shared/turbo/common/turbo-args.const.ts';

export { TurboException } from './shared/errors/common/turbo.exception.ts';

export type { TurboErrorKind } from './shared/errors/common/turbo-error.type.ts';

export { plainLine, plainLines } from './shared/errors/utils/plain-text.util.ts';

export { isWithin } from './shared/fs/utils/path-within.util.ts';

export { affectedTasksSchema } from './shared/turbo/common/affected-tasks.schema.ts';

export { dryRunSchema } from './shared/turbo/common/dry-run.schema.ts';

export { packageGraphSchema } from './shared/turbo/common/package-graph.schema.ts';

export { runSummarySchema } from './shared/turbo/common/run-summary.schema.ts';

export { AFFECTED_TASKS_QUERY, PACKAGE_GRAPH_QUERY } from './shared/turbo/common/turbo-query.const.ts';

export { SCHEMA_SDL_SHA256, SUPPORTED_TURBO_RANGE } from './shared/turbo/common/turbo-version.const.ts';

export type { AffectedTasks, DryRun, PackageGraph, RunSummary, TurboVersionRange } from './shared/turbo/common/turbo.type.ts';

export { assertTaskName } from './shared/turbo/utils/turbo-name.util.ts';

export type { AtomFile, AtomGroup } from './workspace/common/atom-group.type.ts';

export type {
  LockfileName,
  PackageEdge,
  PackageManager,
  PackageManagerName,
  PackageManagerSource,
  PackageNode,
  TaskNode,
  WorkspaceModel
} from './workspace/common/workspace-model.type.ts';

export { loadWorkspace } from './workspace/domain-logic/load-workspace.ts';

export { atomGroupsOf } from './workspace/utils/atom-groups.util.ts';
