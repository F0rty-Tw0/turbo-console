import { posix } from 'node:path';

/**
 * A `.` or `..` segment, an empty segment (`//`) or a trailing slash: a dir with none of them, and not empty, is already
 * what `normalDir` gives. A model build normalizes every task's package dir, so the check skips `posix.normalize`.
 */
const NOT_NORMAL = /(?:^|\/)\.{1,2}(?:\/|$)|\/\/|\/$/;

/** `apps\e2e-1` → `apps/e2e-1`; a posix path passes through unchanged. */
export const toPosixPath = (path: string): string => path.replaceAll('\\', '/');

/**
 * A posix directory in the form `posix.dirname` gives for a file inside it: `./a/`, `a/./b` → `a`, `a/b`; `''`, `./`
 * → `.`. Leading `..` segments are kept (`a/../../b` → `../b`).
 */
export const normalDir = (dir: string): string => {
  const hasOddSegment = NOT_NORMAL.test(dir);
  const isNormal = dir !== '' && !hasOddSegment;

  if (isNormal) return dir;

  const normal = posix.normalize(dir);
  const endsWithSlash = normal.endsWith('/');
  const isTrailing = normal.length > 1 && endsWithSlash;

  if (!isTrailing) return normal;

  return normal.slice(0, -1);
};
