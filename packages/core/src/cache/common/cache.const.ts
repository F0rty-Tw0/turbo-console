/** A cache file of any other `formatVersion` is a miss. */
export const CACHE_FORMAT_VERSION = 4;

/** The lockfiles turbo supports: each is hashed up to `MAX_LOCKFILE_BYTES`, wherever it sits. */
export const LOCKFILE_NAMES = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lock', 'bun.lockb'];

/**
 * Root files that change turbo's package graph: workspace globs, configs, the lockfiles turbo supports, and `.npmrc`,
 * whose `link-workspace-packages` changes turbo's package edges.
 */
export const ROOT_KEYED_FILES = ['.npmrc', 'package.json', 'turbo.json', 'turbo.jsonc', 'pnpm-workspace.yaml', ...LOCKFILE_NAMES];

/** Keyed in every graph package, hidden ones included: the Atomizer definitions package holds the file tasks. */
export const PACKAGE_KEYED_FILES = ['package.json', 'turbo.json', 'turbo.jsonc'];

/** Covers coarse filesystem timestamps when telling whether a keyed file changed during the spawn. */
export const MTIME_SLACK_MS = 2000;

/** The digest of a keyed file that does not exist. */
export const MISSING_DIGEST = 'missing';

/**
 * The digest of a keyed file whose open or read failed (`EACCES`, `EBUSY`, ...). A file whose stat size grew while a
 * read ran past its limit is still being written and is `unreadable:<size>:<mtimeMs>`.
 */
export const UNREADABLE_DIGEST = 'unreadable';

/** The digest of a keyed path that exists but is no regular file: a directory, FIFO, socket or device. */
export const NOT_REGULAR_DIGEST = 'not-regular';

/** Starts the digest of a keyed file too large to hash: `over-cap:<size>:<mtimeMs>`, or `OVER_CAP_READ_DIGEST`. */
export const OVER_CAP_PREFIX = 'over-cap:';

/**
 * The digest of a keyed file that read past its byte cap, or more than 1 MiB past its stat size, while that stat size
 * did not grow (procfs reports 0 and stays 0).
 */
export const OVER_CAP_READ_DIGEST = `${OVER_CAP_PREFIX}read`;

/**
 * The most bytes hashed from one keyed file that is no lockfile (`package.json`, `turbo.json(c)`,
 * `pnpm-workspace.yaml`, `.npmrc`), far above any real one: a larger regular file is keyed by size and mtime, and one
 * that reads past it after a smaller stat size that did not grow is `OVER_CAP_READ_DIGEST`.
 */
export const MAX_KEYED_FILE_BYTES = 4 * 1024 * 1024;

/** `MAX_KEYED_FILE_BYTES` for a file named in `LOCKFILE_NAMES`: a large monorepo's lockfile runs to tens of MiB. */
export const MAX_LOCKFILE_BYTES = 64 * 1024 * 1024;

/**
 * The largest cache file written or read, in bytes. The `stretch-300` model's file is ~1.42 MiB (280 visible
 * packages, 5342 tasks); 16 MiB leaves about 11 times that.
 */
export const MAX_CACHE_BYTES = 16 * 1024 * 1024;
