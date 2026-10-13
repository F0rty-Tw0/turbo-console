import { randomUUID } from 'node:crypto';
import { mkdir, open, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { z } from 'zod';

import { errnoCode } from '../../shared/errors/utils/errno.util.ts';
import { ioMessage, plainPath } from '../../shared/errors/utils/turbo-message.util.ts';
import { READ_NON_BLOCKING } from '../../shared/fs/common/open-flags.const.ts';
import { cacheFileSchema } from '../common/cache-file.schema.ts';
import { CACHE_FORMAT_VERSION, MAX_CACHE_BYTES } from '../common/cache.const.ts';
import type { CacheEntry } from '../common/cache.type.ts';
import { cacheFileName, isKeyedPath } from '../utils/cache-key.util.ts';

type CacheFile = z.infer<typeof cacheFileSchema>;

const TOO_LARGE = 'workspace model too large to cache';

/** Owner only, as the cache file: the model names every task, its command and every package path. */
const MKDIR_OPTIONS = { recursive: true, mode: 0o700 };

/** Owner only, and `wx`: the temp file is new, so a file or link planted at its name fails the write instead of being followed. */
const TEMP_WRITE_OPTIONS = { mode: 0o600, flag: 'wx' };

const hasOnlyKeyedPaths = (file: CacheFile): boolean => file.keyedPaths.every(isKeyedPath);

/** `keyedPaths` are hashed relative to the root on every read: a tampered path outside it, or named like no keyed file, is a miss. */
const trustedFileSchema = cacheFileSchema.refine(hasOnlyKeyedPaths);

/**
 * Cleanup changes no outcome: a close after the text is read or the file refused, and the removal of a temp file left
 * by a failed write (clutter only; `rm` throws `ENOTDIR` even with `force` when `cacheDir` is a file).
 */
const ignoreCleanupError = (): undefined => undefined;

const removeTemp = async (path: string): Promise<void> => {
  await rm(path, { force: true }).catch(ignoreCleanupError);
};

/** The text of the regular file at `path` of at most `MAX_CACHE_BYTES`, else `null`; a FIFO never blocks the open. Rejects on a failed open or read. */
const cappedText = async (path: string): Promise<string | null> => {
  const handle = await open(path, READ_NON_BLOCKING);

  try {
    const stats = await handle.stat();
    const isFile = stats.isFile();
    const isTooLarge = stats.size > MAX_CACHE_BYTES;

    if (!isFile || isTooLarge) return null;

    return await handle.readFile('utf8');
  } finally {
    await handle.close().catch(ignoreCleanupError);
  }
};

/** The file's text; `null` when it is missing, not a regular file, over `MAX_CACHE_BYTES` or cannot be read. */
const readText = async (path: string): Promise<string | null> => {
  try {
    return await cappedText(path);
  } catch {
    return null;
  }
};

/** `text` as a cache file; `null` when it is not JSON, has another `formatVersion`, breaks the schema or names a path no key hashes. */
const parsedFile = (text: string): CacheFile | null => {
  let json: unknown;

  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }

  const parsed = trustedFileSchema.safeParse(json);

  return parsed.success ? parsed.data : null;
};

/**
 * The cache entry of `root` in `cacheDir`; `null` (a miss, never a throw) when the file is missing, not a regular file,
 * over `MAX_CACHE_BYTES`, unreadable, not JSON, of another `formatVersion`, breaks the schema, names a keyed path
 * outside the root or with a name no key hashes, or holds another root's model.
 */
export const readCacheFile = async (cacheDir: string, root: string): Promise<CacheEntry | null> => {
  const fileName = cacheFileName(root);
  const text = await readText(join(cacheDir, fileName));

  if (text === null) return null;

  const file = parsedFile(text);

  if (file === null) return null;

  const isOtherRoot = file.model.root !== root;

  if (isOtherRoot) return null;

  const entry: CacheEntry = { key: file.key, keyedPaths: file.keyedPaths, model: file.model };

  return entry;
};

/** `entry` as cache file JSON; `null` when it is over `MAX_CACHE_BYTES`, or too long for `JSON.stringify` (`RangeError`). */
const cacheJson = (entry: CacheEntry): string | null => {
  const file = { formatVersion: CACHE_FORMAT_VERSION, ...entry };

  try {
    const json = JSON.stringify(file);
    const isTooLarge = Buffer.byteLength(json) > MAX_CACHE_BYTES;

    return isTooLarge ? null : json;
  } catch (error) {
    if (error instanceof RangeError) return null;

    throw error;
  }
};

/**
 * Writes `entry` as the cache file of its model's root: `cacheDir` created owner-only when missing, then an owner-only
 * temp file in it renamed over the cache file, so a reader never sees half a file. Best-effort: resolves `null` on
 * success and never rejects. A model over `MAX_CACHE_BYTES` writes nothing and resolves `<cacheDir>: workspace model
 * too large to cache`; any other failure resolves `<cacheDir>: <code>` and removes the temp file.
 */
export const writeCacheFile = async (cacheDir: string, entry: CacheEntry): Promise<string | null> => {
  const fileName = cacheFileName(entry.model.root);
  const target = join(cacheDir, fileName);
  const tempId = randomUUID();
  const temp = `${target}.${process.pid}.${tempId}.tmp`;

  try {
    const json = cacheJson(entry);

    if (json === null) return `${plainPath(cacheDir)}: ${TOO_LARGE}`;

    await mkdir(cacheDir, MKDIR_OPTIONS);
    await writeFile(temp, json, TEMP_WRITE_OPTIONS);
    await rename(temp, target);

    return null;
  } catch (error) {
    await removeTemp(temp);

    return ioMessage(cacheDir, errnoCode(error));
  }
};
