import type { Stats } from 'node:fs';
import { lstat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { READ_NO_FOLLOW } from '../../shared/fs/common/open-flags.const.ts';
import { readSmallFile } from '../../shared/fs/data-access/small-file.ts';
import { isWithin } from '../../shared/fs/utils/path-within.util.ts';
import { IMPORT_SCAN_CAPS, TSCONFIG_CHAIN_MAX, TSCONFIG_NAME } from '../common/import-scan.const.ts';
import type { TsconfigPaths } from '../common/import-scan.type.ts';
import type { TsconfigFile, TsconfigLink } from '../common/tsconfig.type.ts';
import { extendedPathsOf, tsconfigFileOf } from '../utils/tsconfig-file.util.ts';
import { tsconfigPathsOf } from '../utils/tsconfig-paths.util.ts';

/** What one read of a chain tracks: paths already tried, and the stack of candidate lists still to pop. */
type ChainRead = {
  readonly root: string;
  readonly seen: Set<string>;
  readonly stack: string[][];
};

/** The `lstat` of `path`, or `null` when it is missing; never rejects. */
const statOf = async (path: string): Promise<Stats | null> => {
  try {
    return await lstat(path);
  } catch {
    return null;
  }
};

/** The config at `path` when it is a regular file within the byte cap (no symlink, no oversize open); never rejects. */
const readLinkFile = async (path: string, stats: Stats): Promise<TsconfigFile | null> => {
  const isRegular = stats.isFile();
  const isTooBig = stats.size > IMPORT_SCAN_CAPS.fileBytes;

  if (!isRegular || isTooBig) return null;

  try {
    const text = await readSmallFile(path, IMPORT_SCAN_CAPS.fileBytes, READ_NO_FOLLOW);

    if (text === null) return null;

    return tsconfigFileOf(text);
  } catch {
    return null;
  }
};

/**
 * The link of one candidate list, as TS reads it: a candidate that was tried before ends the list, and so does the first
 * one that exists, whether or not it reads as a config. Only a candidate that is missing or a directory (TS needs a
 * file) goes on to the next, and a candidate outside the root is passed over.
 */
const linkOf = async (candidates: string[], read: ChainRead): Promise<TsconfigLink | null> => {
  for (const path of candidates) {
    const isSeen = read.seen.has(path);
    const isInside = isWithin(read.root, path);

    if (!isInside) continue;

    if (isSeen) return null;

    read.seen.add(path);

    const stats = await statOf(path);

    const isDirectory = stats?.isDirectory() ?? false;
    const isMissing = stats === null || isDirectory;

    if (isMissing) continue;

    const file = await readLinkFile(path, stats);

    if (file === null) return null;

    const link: TsconfigLink = { dir: dirname(path), file };

    return link;
  }

  return null;
};

/** Pushes the entries first to last, so the last entry pops first (TS: a later `extends` wins). */
const pushExtended = (link: TsconfigLink, read: ChainRead): void => {
  for (const entry of link.file.extends) {
    const candidates = extendedPathsOf(link.dir, entry);
    const isFollowed = candidates.length > 0;

    if (isFollowed) read.stack.push(candidates);
  }
};

/**
 * The effective tsconfig `paths` of package `dir` (D6): `<dir>/tsconfig.json` and its relative `extends`, depth first in
 * TS precedence order, each path within `root`, tried at most once, at most `TSCONFIG_CHAIN_MAX` candidate lists. A list
 * opens at most one file: the first candidate that exists and is not a directory. If that file is not a regular file (a
 * symlink included), is over 1 MiB or is not a valid config, it adds nothing, its `extends` are not followed and the
 * list's later candidates are not tried. Never rejects.
 */
export const readTsconfigPaths = async (dir: string, root: string): Promise<TsconfigPaths | null> => {
  const read: ChainRead = { root, seen: new Set(), stack: [[join(dir, TSCONFIG_NAME)]] };
  const links: TsconfigLink[] = [];

  for (let attempts = 0; attempts < TSCONFIG_CHAIN_MAX; attempts++) {
    const candidates = read.stack.pop();

    if (candidates === undefined) break;

    const link = await linkOf(candidates, read);

    if (link === null) continue;

    links.push(link);
    pushExtended(link, read);
  }

  return tsconfigPathsOf(links);
};
