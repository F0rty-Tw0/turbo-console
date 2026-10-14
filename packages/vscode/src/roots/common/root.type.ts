import type { CachedWorkspace, TurboBinary, TurboException, WorkspaceModel } from '@turbo-console/core';

export type RootFolder = {
  readonly root: string;
  readonly name: string;
};

export type LoadMode = 'cache-first' | 'full';

export type LoadedModel = {
  readonly kind: 'model';
  readonly binary: TurboBinary;
  readonly model: WorkspaceModel;
  readonly fromCache: boolean;
  readonly isFresh: boolean;
};

type LoadStage = 'binary' | 'load';

export type LoadFailure = {
  readonly kind: 'error';
  readonly stage: LoadStage;
  readonly error: TurboException;
};

export type LoadResult = LoadedModel | LoadFailure;

/**
 * Ports of one root: the folder, the editor's storage dir and the progress UI are closed over by whoever builds them.
 * `log` takes one clean line (already through `logTextOf`), so the sink never sees an error object or its `cause`; it
 * must not throw, since `loadRoot` calls it on its failure paths and promises never to throw.
 */
export type LoadDeps = {
  readonly resolve: (signal: AbortSignal) => Promise<TurboBinary>;
  readonly readCached: (binary: TurboBinary) => Promise<CachedWorkspace | null>;
  readonly load: (binary: TurboBinary, signal: AbortSignal) => Promise<WorkspaceModel>;
  /** Takes a load slot shared by every root; rejects when `signal` aborts while queued. Call the result once to free it. */
  readonly acquire: (signal: AbortSignal) => Promise<() => void>;
  readonly progress: (work: () => Promise<WorkspaceModel>) => Promise<WorkspaceModel>;
  readonly log: (line: string) => void;
};
