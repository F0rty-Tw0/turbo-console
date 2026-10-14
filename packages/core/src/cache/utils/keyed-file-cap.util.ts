import { posix } from 'node:path';

import { LOCKFILE_NAMES, MAX_KEYED_FILE_BYTES, MAX_LOCKFILE_BYTES } from '../common/cache.const.ts';

/**
 * The most bytes hashed from the keyed file at posix `path`, chosen by its base name: `MAX_LOCKFILE_BYTES` for a
 * lockfile, `MAX_KEYED_FILE_BYTES` for any other, root and package files alike.
 */
export const keyedFileCapOf = (path: string): number => {
  const name = posix.basename(path);
  const isLockfile = LOCKFILE_NAMES.includes(name);

  return isLockfile ? MAX_LOCKFILE_BYTES : MAX_KEYED_FILE_BYTES;
};
