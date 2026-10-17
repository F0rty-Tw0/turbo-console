import type { WorkspaceModel } from '../../workspace/common/workspace-model.type.ts';

/**
 * One keyed file: `path` posix, relative to the root; `digest` the sha256 hex of its content, `missing`, `unreadable`
 * (the open or read failed), `unreadable:<size>:<mtimeMs>` (its stat size grew while a read ran past its limit: still
 * being written), `not-regular` (a directory, FIFO, socket or device), `over-cap:<size>:<mtimeMs>` (a regular file over
 * its byte cap) or `over-cap:read` (one that read past its cap, or more than 1 MiB past its stat size, while that size
 * did not grow); `mtimeMs` is the file's only for the sha256 and the `<size>:<mtimeMs>` forms, else `null`.
 */
export type KeyedFile = {
  readonly path: string;
  readonly digest: string;
  readonly mtimeMs: number | null;
};

/** A model with the key of the files it was built from (`null`: one changed or a manifest vanished during the build, never fresh). */
export type CacheEntry = {
  readonly key: string | null;
  readonly keyedPaths: string[];
  readonly model: WorkspaceModel;
};

/**
 * A cached model, read without hashing, and `isFresh`, which hashes its keyed files now and resolves whether they still
 * give the key it was stored with.
 */
export type CachedWorkspace = {
  readonly model: WorkspaceModel;
  readonly isFresh: () => Promise<boolean>;
};

/** What a store needs from before the spawn: when it started and the root keyed files as hashed then. */
export type SpawnMark = {
  readonly startedAt: number;
  readonly rootFiles: KeyedFile[];
};
