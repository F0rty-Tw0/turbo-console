/**
 * One keyed file: `path` posix, relative to the root; `digest` the sha256 hex of its content, `missing` or
 * `unreadable`; `mtimeMs` `null` unless it was read.
 */
export type KeyedFile = {
  readonly path: string;
  readonly digest: string;
  readonly mtimeMs: number | null;
};
