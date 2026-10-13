import { createHash } from 'node:crypto';
import type { Stats } from 'node:fs';
import { open } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { join } from 'node:path';

import { isMissing } from '../../shared/errors/utils/errno.util.ts';
import { READ_NON_BLOCKING } from '../../shared/fs/common/open-flags.const.ts';
import { MAX_KEYED_FILE_BYTES, MISSING_DIGEST, UNREADABLE_DIGEST } from '../common/cache.const.ts';
import type { KeyedFile } from '../common/cache.type.ts';

/** Each read holds a file open, so a graph of thousands of packages cannot run out of descriptors (EMFILE). */
const MAX_CONCURRENT_READS = 16;

/** One reused buffer per file: memory stays bounded whatever the file size (a lockfile can be many MiB). */
const CHUNK_BYTES = 64 * 1024;

/** The digest is already known, or the read already failed: a failing close changes neither. */
const ignoreCloseError = (): undefined => undefined;

const markerFile = (path: string, digest: string): KeyedFile => {
  const file: KeyedFile = { path, digest, mtimeMs: null };

  return file;
};

/**
 * The sha256 hex of everything `handle` reads from its start to the end of the file, `CHUNK_BYTES` at a time. Rejects
 * once more than `MAX_KEYED_FILE_BYTES` were read: a file whose stat size lies, such as procfs `/proc/self/pagemap` (size 0,
 * yet it reads on for hundreds of GiB), is never hashed in part.
 */
const digestOf = async (handle: FileHandle): Promise<string> => {
  const hash = createHash('sha256');
  const chunk = Buffer.alloc(CHUNK_BYTES);
  let total = 0;
  let isEnd = false;

  while (!isEnd) {
    const { bytesRead } = await handle.read(chunk, 0, CHUNK_BYTES, null);
    const bytes = chunk.subarray(0, bytesRead);

    total += bytesRead;

    if (total > MAX_KEYED_FILE_BYTES) throw new RangeError(`keyed file over ${MAX_KEYED_FILE_BYTES} bytes`);

    hash.update(bytes);
    isEnd = bytesRead === 0;
  }

  return hash.digest('hex');
};

/**
 * A regular file whose stat size is over `MAX_KEYED_FILE_BYTES`, keyed by that size and its mtime instead of its
 * content: an edit still changes the key and still shows to the mtime check, without reading the file.
 */
const overCapFile = (path: string, stats: Stats): KeyedFile => {
  const digest = `over-cap:${stats.size}:${stats.mtimeMs}`;
  const file: KeyedFile = { path, digest, mtimeMs: stats.mtimeMs };

  return file;
};

/**
 * The content digest and mtime of the regular file at `path`; any other kind of file is `unreadable`, and one whose
 * stat size is over `MAX_KEYED_FILE_BYTES` is `over-cap:<size>:<mtimeMs>`, unread. The mtime comes from a stat after
 * the read, so an edit landing during the read shows in it. Rejects on a failed open or read, or on reading more than
 * `MAX_KEYED_FILE_BYTES` from a file whose stat size said less.
 */
const hashFile = async (root: string, path: string): Promise<KeyedFile> => {
  const handle = await open(join(root, path), READ_NON_BLOCKING);

  try {
    const opened = await handle.stat();
    const isFile = opened.isFile();

    if (!isFile) return markerFile(path, UNREADABLE_DIGEST);

    const isOverCap = opened.size > MAX_KEYED_FILE_BYTES;

    if (isOverCap) return overCapFile(path, opened);

    const digest = await digestOf(handle);
    const read = await handle.stat();
    const file: KeyedFile = { path, digest, mtimeMs: read.mtimeMs };

    return file;
  } finally {
    await handle.close().catch(ignoreCloseError);
  }
};

/**
 * Never rejects: a path that does not exist (or whose parent is not a directory) is `missing`, any other failure
 * `unreadable`, a read past `MAX_KEYED_FILE_BYTES` included.
 */
const hashKeyedFile = async (root: string, path: string): Promise<KeyedFile> => {
  try {
    return await hashFile(root, path);
  } catch (error) {
    const isAbsent = isMissing(error);
    const digest = isAbsent ? MISSING_DIGEST : UNREADABLE_DIGEST;

    return markerFile(path, digest);
  }
};

/**
 * Each of `paths` (posix, relative to `root`) as a `KeyedFile`, in input order, at most `MAX_CONCURRENT_READS` read at
 * a time. Never rejects, so a keyed file that cannot be read changes the key instead of failing the load or the read.
 * A regular file whose stat size is over `MAX_KEYED_FILE_BYTES` is keyed by size and mtime, unread. One whose stat size
 * lies (a procfs symlink reports size 0 and reads on) is `unreadable` once a read passes the cap and is never hashed
 * in part, so one hash reads at most that many bytes per path.
 */
export const hashKeyedFiles = async (root: string, paths: string[]): Promise<KeyedFile[]> => {
  const files: KeyedFile[] = [];
  const cursor = paths.entries();

  const worker = async (): Promise<void> => {
    for (const [index, path] of cursor) files[index] = await hashKeyedFile(root, path);
  };

  const workers = Array.from({ length: MAX_CONCURRENT_READS }, worker);

  await Promise.all(workers);

  return files;
};
