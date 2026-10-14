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

/** Ports of one root: the folder, the editor's storage dir and the progress UI are closed over by whoever builds them. */
export type LoadDeps = {
  readonly resolve: (signal: AbortSignal) => Promise<TurboBinary>;
  readonly readCached: (binary: TurboBinary) => Promise<CachedWorkspace | null>;
  readonly load: (binary: TurboBinary, signal: AbortSignal) => Promise<WorkspaceModel>;
  readonly progress: (work: () => Promise<WorkspaceModel>) => Promise<WorkspaceModel>;
  readonly log: (error: unknown) => void;
};
