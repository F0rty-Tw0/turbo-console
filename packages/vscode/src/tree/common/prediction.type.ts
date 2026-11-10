import type { DryRunRequest, DryRunState, TurboBinary, WorkspaceModel } from '@turbo-console/core';

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

/** What `PredictionLoadPorts.after` returns; only `cancel` reads it. */
export type PredictionTimer = { readonly id: unknown };

/**
 * What `PredictionLoads` reads and calls. `binaryOf` is `null` for a folder whose turbo is not resolved. `after` runs
 * `run` once after `ms` unless `cancel` stops it. `changed` fires when the view of some package of `root` changed.
 */
export type PredictionLoadPorts = {
  readonly binaryOf: (root: string) => TurboBinary | null;
  readonly dryRun: (binary: TurboBinary, request: DryRunRequest, signal: AbortSignal) => Promise<DryRunState[]>;
  readonly modelOf: (root: string) => WorkspaceModel | null;
  readonly after: (run: () => void, ms: number) => PredictionTimer;
  readonly cancel: (timer: PredictionTimer) => void;
  readonly now: () => number;
  readonly log: (line: string) => void;
  readonly changed: (root: string) => void;
};
