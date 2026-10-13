import { posix } from 'node:path';

/** `apps\e2e-1` → `apps/e2e-1`; a posix path passes through unchanged. */
export const toPosixPath = (path: string): string => path.replaceAll('\\', '/');

/**
 * A posix directory in the form `posix.dirname` gives for a file inside it: `./a/`, `a/./b` → `a`, `a/b`; `''`, `./`
 * → `.`. Leading `..` segments are kept (`a/../../b` → `../b`).
 */
export const normalDir = (dir: string): string => {
  const normal = posix.normalize(dir);
  const endsWithSlash = normal.endsWith('/');
  const isTrailing = normal.length > 1 && endsWithSlash;

  if (!isTrailing) return normal;

  return normal.slice(0, -1);
};
