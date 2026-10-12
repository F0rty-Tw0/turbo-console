/** npm name of this package. */
export const PACKAGE_NAME = '@turbo-console/core';

export { TurboException } from './shared/errors/common/turbo.exception.ts';

export { affectedTasksSchema } from './shared/turbo/common/affected-tasks.schema.ts';

export { dryRunSchema } from './shared/turbo/common/dry-run.schema.ts';

export { packageGraphSchema } from './shared/turbo/common/package-graph.schema.ts';

export { runSummarySchema } from './shared/turbo/common/run-summary.schema.ts';

export { AFFECTED_TASKS_QUERY, PACKAGE_GRAPH_QUERY } from './shared/turbo/common/turbo-query.const.ts';

export { SCHEMA_SDL_SHA256, SUPPORTED_TURBO_RANGE } from './shared/turbo/common/turbo-version.const.ts';

export type { AffectedTasks, DryRun, PackageGraph, RunSummary, TurboVersionRange } from './shared/turbo/common/turbo.type.ts';
