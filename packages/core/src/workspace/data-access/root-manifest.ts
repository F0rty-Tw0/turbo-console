import { join } from 'node:path';

import { MAX_KEYED_FILE_BYTES, MISSING_DIGEST } from '../../cache/common/cache.const.ts';
import type { KeyedFile } from '../../cache/common/cache.type.ts';
import { isLockfileName } from '../../cache/utils/lockfile-name.util.ts';
import { readSmallFile } from '../../shared/fs/data-access/small-file.ts';
import type { DetectedRoot, ManifestFields } from '../common/manifest-fields.type.ts';
import { NO_MANIFEST_FIELDS } from '../common/package-manager.const.ts';
import type { LockfileName } from '../common/workspace-model.type.ts';
import { packageManagerOf } from '../utils/package-manager.util.ts';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** The `packageManager`, `devEngines.packageManager`, `name` and `workspaces` of a parsed manifest; a missing one is `undefined`. */
const fieldsOf = (manifest: Record<string, unknown>): ManifestFields => {
  const devEngines = manifest['devEngines'];
  const devEnginesManager = isRecord(devEngines) ? devEngines['packageManager'] : undefined;
  const { name, workspaces } = manifest;
  const fields: ManifestFields = { packageManager: manifest['packageManager'], devEnginesManager, name, workspaces };

  return fields;
};

/**
 * The `packageManager`, `devEngines.packageManager`, `name` and `workspaces` values of the root `package.json`, from one
 * read and one parse, unchecked. Both are `undefined` (`NO_MANIFEST_FIELDS`) for anything else: no such file, one that cannot be read, is
 * over `MAX_KEYED_FILE_BYTES` or is no regular file, text that is not JSON, or a JSON value that is no object. A bad
 * manifest never fails a load: the lockfiles decide instead.
 */
export const readManifestFields = async (root: string): Promise<ManifestFields> => {
  try {
    const text = await readSmallFile(join(root, 'package.json'), MAX_KEYED_FILE_BYTES);

    if (text === null) return NO_MANIFEST_FIELDS;

    const manifest: unknown = JSON.parse(text);

    if (!isRecord(manifest)) return NO_MANIFEST_FIELDS;

    return fieldsOf(manifest);
  } catch {
    return NO_MANIFEST_FIELDS;
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
 * The repo's package manager from the root `packageManager` field, `devEngines.packageManager` and the root lockfiles `rootFiles` hashed: no extra
 * file system call tells which lockfiles exist. The manifest's `name` and `workspaces` come back with it, unchecked,
 * from the same read.
 */
export const detectPackageManager = async (root: string, rootFiles: KeyedFile[]): Promise<DetectedRoot> => {
  const fields = await readManifestFields(root);
  const present = presentLockfiles(rootFiles);
  const packageManager = packageManagerOf(fields, present);
  const { name, workspaces } = fields;
  const detected: DetectedRoot = { packageManager, name, workspaces };

  return detected;
};
