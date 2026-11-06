import {
  DECLARATION_SUFFIXES,
  NODE_MODULES_DIR,
  SOURCE_SUFFIXES,
  TOP_BUILD_DIRS,
  UNREADABLE_DIR_CODES
} from '../common/import-scan.const.ts';

const endsWithAny = (name: string, suffixes: string[]): boolean => suffixes.some((suffix) => name.endsWith(suffix));

/** A source file by suffix: case-sensitive, and a declaration file (`.d.ts`, `.d.mts`, `.d.cts`) is not one (T3). */
export const isSourceName = (name: string): boolean => endsWithAny(name, SOURCE_SUFFIXES) && !endsWithAny(name, DECLARATION_SUFFIXES);

/** Whether the walk enters a directory: never `node_modules` or a dot dir; a build dir only below the top (T3). */
export const isWalkedDirName = (name: string, isTop: boolean): boolean => {
  const isDotDir = name.startsWith('.');

  if (name === NODE_MODULES_DIR || isDotDir) return false;

  const isTopBuildDir = isTop && TOP_BUILD_DIRS.has(name);

  return !isTopBuildDir;
};

/** Whether a failed subdir read only leaves that dir out (no access, gone, not a dir); anything else must fail the scan. */
export const isUnreadableDirError = (error: unknown): boolean => {
  if (!(error instanceof Error) || !('code' in error)) return false;

  const { code } = error;

  return typeof code === 'string' && UNREADABLE_DIR_CODES.has(code);
};
