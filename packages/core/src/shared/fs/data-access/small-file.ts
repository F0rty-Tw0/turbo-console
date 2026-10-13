import { open } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';

import { READ_NON_BLOCKING } from '../common/open-flags.const.ts';

/** Manifests and configs are a few KB; a bigger file is not read. */
const MAX_FILE_BYTES = 1024 * 1024;

/** A close that fails after another failure, or after a refused file, must not replace that outcome. */
const ignoreCloseError = (): undefined => undefined;

/** One byte past the cap, so a file over it is told apart from one exactly at it. */
const READ_LIMIT = MAX_FILE_BYTES + 1;

/** `buffer` doubled, at most `READ_LIMIT` bytes, holding its bytes so far. */
const grown = (buffer: Buffer): Buffer => {
  const length = Math.min(buffer.length * 2, READ_LIMIT);
  const larger = Buffer.alloc(length);

  buffer.copy(larger);

  return larger;
};

/**
 * At most `READ_LIMIT` bytes, whatever size the file reports. The first buffer fits the reported size plus one byte, so
 * many concurrent reads hold only what they need; a full buffer grows, since procfs files report 0 and read on.
 */
const readBounded = async (handle: FileHandle, size: number): Promise<Buffer> => {
  const firstLength = Math.min(size, MAX_FILE_BYTES) + 1;
  let buffer: Buffer = Buffer.alloc(firstLength);
  let filled = 0;
  let isEnd = false;

  while (!isEnd && filled < READ_LIMIT) {
    if (filled === buffer.length) buffer = grown(buffer);

    const { bytesRead } = await handle.read(buffer, filled, buffer.length - filled, null);

    filled += bytesRead;
    isEnd = bytesRead === 0;
  }

  return buffer.subarray(0, filled);
};

const textOf = async (handle: FileHandle): Promise<string | null> => {
  const stats = await handle.stat();
  const isFile = stats.isFile();

  if (!isFile) return null;

  const bytes = await readBounded(handle, stats.size);
  const isTooBig = bytes.length > MAX_FILE_BYTES;

  if (isTooBig) return null;

  return bytes.toString('utf8');
};

/**
 * The UTF-8 text of `path` when it is a regular file of at most 1 MiB, else `null`; a FIFO never blocks the read.
 * Other failures reject with the raw error: `open`'s carries the path, a `FileHandle` error (a failed close among
 * them) does not, so the caller names the path. A close failing after a `null` or a failed read is ignored.
 */
export const readSmallFile = async (path: string): Promise<string | null> => {
  const handle = await open(path, READ_NON_BLOCKING);

  try {
    const text = await textOf(handle);

    if (text === null) {
      await handle.close().catch(ignoreCloseError);

      return null;
    }

    await handle.close();

    return text;
  } catch (error) {
    await handle.close().catch(ignoreCloseError);

    throw error;
  }
};
