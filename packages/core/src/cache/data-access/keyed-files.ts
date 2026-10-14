import { createHash } from 'node:crypto';
import type { Stats } from 'node:fs';
import { open, stat } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { join } from 'node:path';

import { isMissing } from '../../shared/errors/utils/errno.util.ts';
import { READ_NON_BLOCKING } from '../../shared/fs/common/open-flags.const.ts';
import {
  MISSING_DIGEST,
  NOT_REGULAR_DIGEST,
  OVER_CAP_PREFIX,
  OVER_CAP_READ_DIGEST,
  UNREADABLE_DIGEST
} from '../common/cache.const.ts';
import type { KeyedFile } from '../common/cache.type.ts';
import { keyedFileCapOf } from '../utils/keyed-file-cap.util.ts';

/** Each read holds a file open, so a graph of thousands of packages cannot run out of descriptors (EMFILE). */
const MAX_CONCURRENT_READS = 16;

/** One reused buffer per file: memory stays bounded whatever the file size (a lockfile can be many MiB). */
const CHUNK_BYTES = 64 * 1024;

/**
 * How far a read may run past the stat size from the open: a file still being written grows a little during the read
 * (one that grows more is `unreadable`), while procfs reports size 0 and reads on, so a refused load stops after about
 * this much instead of the full cap.
 */
const PAST_SIZE_SLACK_BYTES = 1024 * 1024;

/** The digest is already known, or the read already failed: a failing close changes neither. */
const ignoreCloseError = (): undefined => undefined;

const markerFile = (path: string, digest: string): KeyedFile => {
  const file: KeyedFile = { path, digest, mtimeMs: null };

  return file;
};

/**
 * The sha256 hex of everything `handle` reads from its start to the end of the file, `CHUNK_BYTES` at a time, or
 * `null` once more than `limit` bytes were read: a file whose stat size lies, such as procfs `/proc/self/pagemap`
 * (size 0, yet it reads on for hundreds of GiB), is never hashed in part.
 */
const digestOf = async (handle: FileHandle, limit: number): Promise<string | null> => {
  const hash = createHash('sha256');
  const chunk = Buffer.alloc(CHUNK_BYTES);
  let total = 0;
  let isEnd = false;

  while (!isEnd) {
    const { bytesRead } = await handle.read(chunk, 0, CHUNK_BYTES, null);
    const bytes = chunk.subarray(0, bytesRead);

    total += bytesRead;

    if (total > limit) return null;

    hash.update(bytes);
    isEnd = bytesRead === 0;
  }

  return hash.digest('hex');
};

/**
 * A regular file whose stat size is over its byte cap, keyed by that size and its mtime instead of its
 * content: an edit still changes the key and still shows to the mtime check, without reading the file.
 */
const overCapFile = (path: string, stats: Stats): KeyedFile => {
  const digest = `${OVER_CAP_PREFIX}${stats.size}:${stats.mtimeMs}`;
  const file: KeyedFile = { path, digest, mtimeMs: stats.mtimeMs };

  return file;
};

/**
 * A regular file that grew past the read limit while it was read, keyed by its size and mtime after the read: it is
 * still being written, so each further write changes the key and its mtime shows to the edit check.
 */
const growingFile = (path: string, stats: Stats): KeyedFile => {
  const digest = `${UNREADABLE_DIGEST}:${stats.size}:${stats.mtimeMs}`;
  const file: KeyedFile = { path, digest, mtimeMs: stats.mtimeMs };

  return file;
};

/**
 * The content digest and mtime of the regular file at `path`; any other kind of file is `not-regular`, by a stat that
 * follows symlinks before the open, so a device or FIFO is never opened, and by a stat of the open handle, so a swap
 * in between is caught too. One whose stat size is over its cap (`keyedFileCapOf`) is `over-cap:<size>:<mtimeMs>`,
 * unread. The read stops once it passes the cap, or runs more than `PAST_SIZE_SLACK_BYTES` past the stat size from the
 * open, and a stat after it tells why: a file whose stat size grew is still being written and is
 * `unreadable:<size>:<mtimeMs>`, so the load still runs under a key that changes with each write, while one whose stat size did not grow (procfs reports 0 and stays 0) is
 * `over-cap:read`. The mtime comes from that stat after the read, so an edit landing during the read shows in it.
 * Rejects on a failed stat, open or read.
 */
const hashFile = async (root: string, path: string): Promise<KeyedFile> => {
  const fullPath = join(root, path);
  const target = await stat(fullPath);
  const isTargetFile = target.isFile();

  if (!isTargetFile) return markerFile(path, NOT_REGULAR_DIGEST);

  const cap = keyedFileCapOf(path);
  const handle = await open(fullPath, READ_NON_BLOCKING);

  try {
    const opened = await handle.stat();
    const isFile = opened.isFile();

    if (!isFile) return markerFile(path, NOT_REGULAR_DIGEST);

    const isOverCap = opened.size > cap;

    if (isOverCap) return overCapFile(path, opened);

    const readLimit = Math.min(cap, opened.size + PAST_SIZE_SLACK_BYTES);
    const digest = await digestOf(handle, readLimit);
    const read = await handle.stat();
    const hasGrown = read.size > opened.size;

    if (digest === null && hasGrown) return growingFile(path, read);

    if (digest === null) return markerFile(path, OVER_CAP_READ_DIGEST);

    const file: KeyedFile = { path, digest, mtimeMs: read.mtimeMs };

    return file;
  } finally {
    await handle.close().catch(ignoreCloseError);
  }
};

/** Never rejects: a path that does not exist (or whose parent is not a directory) is `missing`, any other failure `unreadable`. */
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
 * A path that is no regular file is `not-regular`, never opened. A regular file whose stat size is over its cap
 * (`keyedFileCapOf`: 64 MiB for a lockfile, 4 MiB for any other) is keyed by size and mtime, unread. A read stops once
 * it passes the cap or runs 1 MiB past the stat size, so one hash reads at most that limit plus one 64 KiB chunk per
 * path, and a file is never hashed in part: one whose stat size grew during the read is `unreadable`, and one whose
 * stat size lies and stays put (a procfs symlink reports size 0 and reads on) is `over-cap:read`.
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
