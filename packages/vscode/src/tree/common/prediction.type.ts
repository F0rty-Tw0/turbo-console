import type { DryRunRequest, DryRunState, TurboBinary, WorkspaceModel } from '@turbo-console/core';

import type { RootChange } from '../../roots/common/coordinator.type.ts';

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

/** The prediction of a package of `root`, or `null` when it has none. */
export type PredictionLookup = (root: string, packageName: string) => PredictionView | null;

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

/** The host half of `PredictionLoadPorts`: the store supplies `modelOf` and `changed` itself. */
export type PredictionHostPorts = Omit<PredictionLoadPorts, 'changed' | 'modelOf'>;

/** Hears that the view of some package of `root` changed. */
export type PredictionListener = (root: string) => void;

/**
 * The one `PredictionLoads` of a window, shared by the tree and the graph: its public methods plus `onDidChange`, which
 * subscribes a listener and returns its remover. `dispose` forgets every listener, then aborts every run.
 */
export type SharedPrediction = {
  readonly view: PredictionLookup;
  readonly packageShown: (root: string, packageName: string) => void;
  readonly toggled: (shown: boolean) => void;
  readonly runEnded: (root: string) => void;
  readonly modelChanged: (change: RootChange) => void;
  readonly refreshAll: () => void;
  readonly rootsKept: (kept: ReadonlySet<string>) => void;
  readonly dispose: () => void;
  readonly onDidChange: (listener: PredictionListener) => () => void;
};

/** The subscribers of a store: `changed` tells each of them, `onDidChange` adds one and returns its remover. */
export type PredictionListeners = {
  readonly changed: PredictionListener;
  readonly onDidChange: (listener: PredictionListener) => () => void;
  readonly clear: () => void;
};
