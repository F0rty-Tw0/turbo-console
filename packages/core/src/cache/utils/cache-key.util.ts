import { createHash } from 'node:crypto';
import { posix } from 'node:path';

import type { GraphPackage } from '../../shared/turbo/common/turbo.type.ts';
import { toPosixPath } from '../../shared/turbo/utils/posix-path.util.ts';
import { isInsideRoot, packageConfigDirs } from '../../workspace/utils/config-dir.util.ts';
import { MISSING_DIGEST, MTIME_SLACK_MS, PACKAGE_KEYED_FILES, ROOT_KEYED_FILES } from '../common/cache.const.ts';
import type { KeyedFile } from '../common/cache.type.ts';

const ROOT_HASH_LENGTH = 16;

const MANIFEST = 'package.json';

/** Every file name a cache key hashes. */
const KEYED_NAMES = [...ROOT_KEYED_FILES, ...PACKAGE_KEYED_FILES];

/** The lowercase sha256 hex of `text` as UTF-8. */
const sha256Hex = (text: string): string => {
  const hash = createHash('sha256');

  hash.update(text);

  return hash.digest('hex');
};

const packagePathOf = (pkg: GraphPackage): string => toPosixPath(pkg.path);

/**
 * The posix relative paths a workspace cache key hashes: the root files, then each graph package's `package.json` and
 * `turbo.json(c)`, hidden packages included; unique, sorted. Package dirs go through `packageConfigDirs`, so a dir
 * outside the root keys nothing and `./a/` keys as `a/package.json`.
 */
export const keyedPathsOf = (packages: GraphPackage[]): string[] => {
  const packagePaths = packages.map(packagePathOf);
  const dirs = packageConfigDirs(packagePaths);
  const paths = new Set(ROOT_KEYED_FILES);

  for (const dir of dirs) {
    for (const file of PACKAGE_KEYED_FILES) paths.add(posix.join(dir, file));
  }

  const unique = [...paths];

  return unique.toSorted();
};

/**
 * Whether a stored keyed path could have come from `keyedPathsOf`: posix, inside the root and named like a keyed file.
 * So a tampered cache file cannot make a read open a path outside the root (`../package.json`) or one named like no
 * keyed file (`COM1`, `a/secret.txt`). A `\` is refused outright: `isInsideRoot` reads it as `/`, but on POSIX it is a
 * plain name character, so `a\b/../../package.json` would check as inside and open the root's parent.
 */
export const isKeyedPath = (path: string): boolean => {
  const name = posix.basename(path);
  const isKeyedName = KEYED_NAMES.includes(name);
  const isPosix = !path.includes('\\');
  const isInside = isInsideRoot(path);

  return isKeyedName && isPosix && isInside;
};

const keyLine = (file: KeyedFile): string => `${file.path}\0${file.digest}`;

/** sha256 over the `<path>\0<digest>` lines sorted and joined by `\n`, then `\n` and `turboVersion`: a turbo upgrade drops the cache. */
export const cacheKeyOf = (files: KeyedFile[], turboVersion: string): string => {
  const lines = files.map(keyLine);
  const sorted = lines.toSorted();

  return sha256Hex(`${sorted.join('\n')}\n${turboVersion}`);
};

/** Whether a keyed file was modified at or after `startedAt` less the slack, so the model may predate that edit. */
export const isEditedSince = (files: KeyedFile[], startedAt: number): boolean => {
  const editedFrom = startedAt - MTIME_SLACK_MS;
  const isEdited = (file: KeyedFile): boolean => file.mtimeMs !== null && file.mtimeMs >= editedFrom;

  return files.some(isEdited);
};

const isVanishedManifest = (file: KeyedFile): boolean => {
  const isManifest = posix.basename(file.path) === MANIFEST;

  return isManifest && file.digest === MISSING_DIGEST;
};

/**
 * Whether a `package.json` keyed file, the root's or a graph package's, is `missing`. turbo read each of them to list
 * the graph, so one missing when hashed after the spawn was deleted after turbo's read and the model may predate that
 * delete: the caller stores such a model with a `null` key, so it is never fresh.
 */
export const hasVanishedManifest = (files: KeyedFile[]): boolean => files.some(isVanishedManifest);

/** `workspace-<first 16 hex of sha256(root)>.json`: one cache file per workspace root. */
export const cacheFileName = (root: string): string => {
  const rootHash = sha256Hex(root);

  return `workspace-${rootHash.slice(0, ROOT_HASH_LENGTH)}.json`;
};
