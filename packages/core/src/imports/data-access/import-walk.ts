import type { Dirent } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { ImportScanLimit } from '../common/import-scan.type.ts';
import type { ImportScanRun, ImportWalk, WalkedFile } from '../common/import-walk.type.ts';
import { isSourceName, isWalkedDirName } from '../utils/import-walk.util.ts';

/** What the walk has listed and counted so far; a set `limit` ends the whole walk. */
type WalkState = {
  readonly files: WalkedFile[];
  // eslint-disable-next-line local/readonly-type-properties -- the walk counts entries as it reads them
  entries: number;

  limit: ImportScanLimit | null;
};

/** Where the walk is: `abs` the dir, `rel` its posix path from the scanned dir ('' for that dir), `depth` 0 for it. */
type WalkPlace = {
  readonly abs: string;
  readonly rel: string;
  readonly depth: number;
};

type EntryStep = 'enter' | 'list' | 'skip';

const byName = (left: Dirent, right: Dirent): number => {
  if (left.name < right.name) return -1;

  return left.name > right.name ? 1 : 0;
};

const readEntries = async (place: WalkPlace): Promise<Dirent[]> => {
  try {
    const entries = await readdir(place.abs, { withFileTypes: true });

    return entries.sort(byName);
  } catch (error) {
    if (place.depth === 0) throw error;

    return [];
  }
};

const stepOf = (entry: Dirent, path: string, run: ImportScanRun, isTop: boolean): EntryStep => {
  const isLink = entry.isSymbolicLink();

  if (isLink) return 'skip';

  const isDirectory = entry.isDirectory();
  const isWalked = isWalkedDirName(entry.name, isTop) && !run.skipDirs.has(path);

  if (isDirectory) return isWalked ? 'enter' : 'skip';

  const isSource = entry.isFile() && isSourceName(entry.name);

  return isSource ? 'list' : 'skip';
};

const relOf = (place: WalkPlace, name: string): string => (place.rel === '' ? name : `${place.rel}/${name}`);

const listFile = (state: WalkState, run: ImportScanRun, file: WalkedFile): void => {
  if (state.files.length >= run.caps.files) state.limit = 'files';
  else state.files.push(file);
};

/** Lists a file, or returns the place of a dir to enter; a link, an ignored entry or a file past the files cap gives null. */
const visitEntry = (state: WalkState, run: ImportScanRun, place: WalkPlace, entry: Dirent): WalkPlace | null => {
  const path = join(place.abs, entry.name);
  const step = stepOf(entry, path, run, place.depth === 0);
  const rel = relOf(place, entry.name);

  if (step === 'list') listFile(state, run, { file: rel, path });

  if (step !== 'enter') return null;

  const child: WalkPlace = { abs: path, rel, depth: place.depth + 1 };

  return child;
};

const walkDir = async (state: WalkState, run: ImportScanRun, place: WalkPlace): Promise<void> => {
  run.signal.throwIfAborted();

  const isOverTime = run.isOverTime();

  if (isOverTime) {
    state.limit = 'time';

    return;
  }

  const entries = await readEntries(place);

  for (const entry of entries) {
    state.entries += 1;

    const isOverEntries = state.entries > run.caps.entries;

    if (isOverEntries) {
      state.limit = 'entries';

      return;
    }

    const child = visitEntry(state, run, place, entry);

    if (child !== null) await walkDir(state, run, child);

    if (state.limit !== null) return;
  }
};

/**
 * The source files under `run.dir` by the T3 rules, in walk order (OQ3), up to the files / entries / time caps (OQ1,
 * OQ2). Rejects with `signal.reason` when aborted and with the raw error when `run.dir` itself cannot be read; a
 * subdir that cannot be read is left out (OQ4).
 */
export const walkSourceFiles = async (run: ImportScanRun): Promise<ImportWalk> => {
  const state: WalkState = { files: [], entries: 0, limit: null };

  await walkDir(state, run, { abs: run.dir, rel: '', depth: 0 });

  const walk: ImportWalk = { files: state.files, limit: state.limit };

  return walk;
};
