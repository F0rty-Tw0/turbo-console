import { lstat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { READ_NO_FOLLOW } from '../../shared/fs/common/open-flags.const.ts';
import { readSmallFile } from '../../shared/fs/data-access/small-file.ts';
import { isWithin } from '../../shared/fs/utils/path-within.util.ts';
import { TSCONFIG_CHAIN_MAX, TSCONFIG_NAME } from '../common/import-scan.const.ts';
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

/** `lstat` first, so a missing file opens nothing and a symlink is refused; never rejects. */
const readLinkFile = async (path: string): Promise<TsconfigFile | null> => {
  try {
    const stats = await lstat(path);
    const isRegular = stats.isFile();

    if (!isRegular) return null;

    const text = await readSmallFile(path, undefined, READ_NO_FOLLOW);

    if (text === null) return null;

    return tsconfigFileOf(text);
  } catch {
    return null;
  }
};

/** The first candidate that lies within the root, was not tried yet and reads as a config. */
const linkOf = async (candidates: string[], read: ChainRead): Promise<TsconfigLink | null> => {
  for (const path of candidates) {
    const isSeen = read.seen.has(path);
    const isInside = isWithin(read.root, path);

    if (isSeen || !isInside) continue;

    read.seen.add(path);

    const file = await readLinkFile(path);

    if (file === null) continue;

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
 * TS precedence order, each path within `root`, tried at most once, at most `TSCONFIG_CHAIN_MAX` attempts. A file that
 * is missing, unreadable, not a regular file (a symlink included), over 1 MiB or not a valid config adds nothing and
 * its `extends` are not followed. Never rejects.
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
