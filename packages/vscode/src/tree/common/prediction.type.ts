import type { DryRunRequest, DryRunState } from '@turbo-console/core';

/** What a dry run says a task does: replay from cache (`HIT`), run (`MISS`), or hash only when it runs (`deferred`). */
export type PredictionCache = DryRunState['cache'];

/** One dry-run request and the task ids it asks for, each mapped to the package that owns it. */
export type PredictionBatch = {
  readonly request: DryRunRequest;
  readonly requested: ReadonlyMap<string, string>;
};

/** The cache words of one package's requested tasks, keyed by task id, and when the dry run that said them settled. */
export type PredictionView = {
  readonly settledAt: number;
  readonly tasks: ReadonlyMap<string, PredictionCache>;
};
