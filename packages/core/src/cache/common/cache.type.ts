import type { WorkspaceModel } from '../../workspace/common/workspace-model.type.ts';

/**
 * One keyed file: `path` posix, relative to the root; `digest` the sha256 hex of its content, `missing` or
 * `unreadable`; `mtimeMs` `null` unless it was read.
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
