import type { TurboBinary, WorkspaceModel } from '@turbo-console/core';

import type { LoadFailure, LoadMode, LoadResult, LoadedModel, RootFolder } from './root.type.ts';

export type ChangeReason = 'watch' | 'setting' | 'refresh';

export type LoadOutcome = 'model' | 'error' | 'aborted';

/**
 * One load of one root, handed to `CoordinatorPorts.record` once when the load starts with `outcome` and `cacheFresh`
 * still `null`. The coordinator sets both on this same object when the load settles, so a reader sees in-flight loads.
 * `cacheFresh` stays `null` for a `full` load; a `cache-first` load reads `true` only when a fresh cache answered it.
 */
export type LoadRecord = {
  readonly mode: LoadMode;
  readonly startedAt: number;
  outcome: LoadOutcome | null;
  // eslint-disable-next-line local/readonly-type-properties -- set in place when the load settles (see the type's doc)
  cacheFresh: boolean | null;
};

/**
 * Editor effects of one root's coordinator. `run` mirrors `loadRoot` (never throws, logs its own failures), so `apply`
 * never logs a failure; `apply` must not throw.
 */
export type CoordinatorPorts = {
  readonly run: (mode: LoadMode, signal: AbortSignal, publish: (result: LoadedModel) => void) => Promise<LoadResult>;
  readonly isVisible: () => boolean;
  readonly apply: (result: LoadResult) => void;
  readonly record: (record: LoadRecord) => void;
  readonly now: () => number;
};

/** The public face of `LoadCoordinator`, so `common/` can name a root's coordinator without importing domain logic. */
export type Coordinator = {
  readonly request: (reason: ChangeReason) => void;
  readonly show: () => void;
  readonly firstChildren: () => Promise<void>;
  readonly ensureLoaded: () => Promise<void>;
  readonly whenSettled: () => Promise<void>;
  readonly isStale: () => boolean;
  readonly dispose: () => void;
};

export type RootState = {
  readonly folder: RootFolder;
  readonly binary: TurboBinary | null;
  readonly model: WorkspaceModel | null;
  readonly error: LoadFailure | null;
};

export type RootEntry = {
  readonly state: RootState;
  readonly coordinator: Coordinator;
};

/** `<stage>:<TurboException kind>` of a `LoadFailure`, for example `binary:not-found`; together they pick the §4.4 row. */
export type ErrorKey = string;

/** The public face of `RootStore` that the tree and the editor wiring read. */
export type Roots = {
  readonly get: (root: string) => RootEntry | undefined;
  readonly all: () => RootEntry[];
  readonly onDidChange: (listener: (change: RootChange) => void) => () => void;
};

/** The public face of `RootsSession` that the editor wiring drives. */
export type Session = {
  readonly store: Roots;
  readonly setWorkspaceFolders: (folders: RootFolder[]) => Promise<RootFolder[]>;
  readonly setVisible: (visible: boolean) => void;
  readonly request: (reason: ChangeReason) => void;
};

export type RootChange = {
  readonly root: string;
  readonly before: WorkspaceModel | null;
  readonly after: WorkspaceModel | null;
  readonly errorBefore: ErrorKey | null;
  readonly errorAfter: ErrorKey | null;
};
