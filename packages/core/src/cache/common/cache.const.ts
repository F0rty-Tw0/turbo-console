/** A cache file of any other `formatVersion` is a miss. */
export const CACHE_FORMAT_VERSION = 2;

/**
 * Root files that change turbo's package graph: workspace globs, configs, the lockfiles turbo supports, and `.npmrc`,
 * whose `link-workspace-packages` changes turbo's package edges.
 */
export const ROOT_KEYED_FILES = [
  '.npmrc',
  'package.json',
  'turbo.json',
  'turbo.jsonc',
  'pnpm-workspace.yaml',
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  'bun.lock',
  'bun.lockb'
];

/** Keyed in every graph package, hidden ones included: the Atomizer definitions package holds the file tasks. */
export const PACKAGE_KEYED_FILES = ['package.json', 'turbo.json', 'turbo.jsonc'];

/** Covers coarse filesystem timestamps when telling whether a keyed file changed during the spawn. */
export const MTIME_SLACK_MS = 2000;

/** The digest of a keyed file that does not exist. */
export const MISSING_DIGEST = 'missing';

/** The digest of a keyed file that exists but cannot be read as a regular file. */
export const UNREADABLE_DIGEST = 'unreadable';

/**
 * The largest cache file written or read, in bytes. The `stretch-300` model's file is ~1.42 MiB (280 visible
 * packages, 5342 tasks); 16 MiB leaves about 11 times that.
 */
export const MAX_CACHE_BYTES = 16 * 1024 * 1024;
