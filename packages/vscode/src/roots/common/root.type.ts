import type { CachedWorkspace, TurboBinary, TurboException, WorkspaceModel } from '@turbo-console/core';

export type RootFolder = {
  readonly root: string;
  readonly name: string;
};

type FolderUri = {
  readonly scheme: string;
  readonly fsPath: string;
};

/** The fields of an editor workspace folder that decide whether it can be a root. */
export type EditorFolder = {
  readonly name: string;
  readonly uri: FolderUri;
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
  /** The failure's one log line, taken from the error as thrown, before `error` rebuilt it; the session logs it once per error key. */
  readonly logText: string;
};

export type LoadResult = LoadedModel | LoadFailure;

/**
 * Ports of one root: the folder, the editor's storage dir and the progress UI are closed over by whoever builds them.
 * `log` takes one clean line (already through `logTextOf`), so the sink never sees an error object or its `cause`; it
 * must not throw, since `loadRoot` and the session call it on failure paths that promise never to throw.
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

type Acquire = LoadDeps['acquire'];

/** What every root's `LoadDeps` share: the editor's storage dir, the error log (finished lines, never throws), the slots. */
export type SharedLoadPorts = {
  readonly cacheDir: string;
  readonly log: (line: string) => void;
  readonly acquire: Acquire;
};

/**
 * `depsFor` builds one root's `LoadDeps` around the session's shared `acquire`. `warn` takes one finished line per
 * model warning and never throws.
 */
export type SessionPorts = {
  readonly depsFor: (root: string, acquire: Acquire) => LoadDeps;
  readonly now: () => number;
  readonly warn: (line: string) => void;
};
