import { join } from 'node:path';

import { MAX_KEYED_FILE_BYTES, MISSING_DIGEST } from '../../cache/common/cache.const.ts';
import type { KeyedFile } from '../../cache/common/cache.type.ts';
import { isLockfileName } from '../../cache/utils/lockfile-name.util.ts';
import { readSmallFile } from '../../shared/fs/data-access/small-file.ts';
import type { LockfileName, PackageManager } from '../common/workspace-model.type.ts';
import { packageManagerOf } from '../utils/package-manager.util.ts';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/**
 * The `packageManager` value of the root `package.json`, or `undefined` for anything else: no such file, one that
 * cannot be read, is over `MAX_KEYED_FILE_BYTES` or is no regular file, text that is not JSON, or a JSON value with no
 * such key. A bad manifest never fails a load: the lockfiles decide instead.
 */
export const readPackageManagerField = async (root: string): Promise<unknown> => {
  try {
    const text = await readSmallFile(join(root, 'package.json'), MAX_KEYED_FILE_BYTES);

    if (text === null) return undefined;

    const manifest: unknown = JSON.parse(text);

    if (!isRecord(manifest)) return undefined;

    return manifest['packageManager'];
  } catch {
    return undefined;
  }
};

/** The root lockfiles among `rootFiles` whose digest says the file exists, taken from the hash already done. */
const presentLockfiles = (rootFiles: KeyedFile[]): Set<LockfileName> => {
  const present = new Set<LockfileName>();

  for (const file of rootFiles) {
    const exists = file.digest !== MISSING_DIGEST;

    if (exists && isLockfileName(file.path)) present.add(file.path);
  }

  return present;
};

/**
 * The repo's package manager from the root `packageManager` field and the root lockfiles `rootFiles` hashed: no extra
 * file system call tells which lockfiles exist.
 */
export const detectPackageManager = async (root: string, rootFiles: KeyedFile[]): Promise<PackageManager> => {
  const field = await readPackageManagerField(root);
  const present = presentLockfiles(rootFiles);

  return packageManagerOf(field, present);
};
