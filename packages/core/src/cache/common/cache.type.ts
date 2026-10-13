import type { WorkspaceModel } from '../../workspace/common/workspace-model.type.ts';

/**
 * One keyed file: `path` posix, relative to the root; `digest` the sha256 hex of its content, `missing`,
 * `unreadable` or `over-cap:<size>:<mtimeMs>` (a regular file too large to hash); `mtimeMs` `null` for `missing` and
 * `unreadable`.
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

/** A cached model, and whether its keyed files still hash to the key it was stored with. */
export type CachedWorkspace = {
  readonly model: WorkspaceModel;
  readonly isFresh: boolean;
};
