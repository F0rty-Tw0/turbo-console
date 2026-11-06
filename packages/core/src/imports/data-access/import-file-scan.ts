import type { Stats } from 'node:fs';
import { lstat } from 'node:fs/promises';

import { READ_NO_FOLLOW } from '../../shared/fs/common/open-flags.const.ts';
import { readSmallFile } from '../../shared/fs/data-access/small-file.ts';
import type { CachedFile } from '../common/import-scan.type.ts';
import type { FileOutcome, WalkedFile } from '../common/import-walk.type.ts';
import { importsOf } from '../utils/imports-of.util.ts';

const SKIPPED: FileOutcome = { kind: 'skipped' };

const scannedOutcome = (cached: CachedFile): FileOutcome => {
  const outcome: FileOutcome = { kind: 'scanned', cached };

  return outcome;
};

const readOutcome = async (path: string, stats: Stats, maxBytes: number): Promise<FileOutcome> => {
  const text = await readSmallFile(path, maxBytes, READ_NO_FOLLOW);

  if (text === null) return SKIPPED;

  // The lexer's strings are slices of `text`; a structured clone writes fresh flat ones, so the cache pins no source (OQ11).
  const imports = structuredClone(importsOf(text));
  const cached: CachedFile = { mtimeMs: stats.mtimeMs, size: stats.size, imports };

  return scannedOutcome(cached);
};

const outcomeOf = async (walked: WalkedFile, known: CachedFile | undefined, maxBytes: number): Promise<FileOutcome> => {
  const stats = await lstat(walked.path);
  const isRegular = stats.isFile();
  const isTooBig = stats.size > maxBytes;

  if (!isRegular || isTooBig) return SKIPPED;

  const isSameStat = known?.mtimeMs === stats.mtimeMs && known.size === stats.size;

  if (isSameStat) return scannedOutcome(known);

  return readOutcome(walked.path, stats, maxBytes);
};

/**
 * Lexes one walked file unless `known` was taken under the same `lstat` mtimeMs and size, then it is returned as is,
 * unread. A file over `maxBytes`, no longer a regular file, or one that cannot be read is skipped, never opened if
 * too big; the open refuses a symlink. The stored stat is the one from before the read (OQ7). Never rejects.
 */
export const scanFile = async (walked: WalkedFile, known: CachedFile | undefined, maxBytes: number): Promise<FileOutcome> => {
  try {
    return await outcomeOf(walked, known, maxBytes);
  } catch {
    return SKIPPED;
  }
};
