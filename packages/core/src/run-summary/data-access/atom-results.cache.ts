import { readRunSummaryFile } from './run-summary-files.ts';
import type { AtomResult } from '../common/atom-result.type.ts';
import type { RunSummaryFile } from '../common/run-summary-file.type.ts';
import { atomResultsOf } from '../utils/atom-result.util.ts';

type CachedResults = {
  readonly mtimeMs: number;
  readonly size: number;
  readonly pending: Promise<Map<string, AtomResult> | null>;
};

/**
 * Per workspace root as given, then per summary file name. Only the small derived results are kept, never the parsed
 * summary: a summary lists every task of a run and would stay pinned in the host process. The entries of a root that is
 * no longer read stay until the process exits. A root is pruned to its listing at each call, so it holds about
 * `MAX_SUMMARY_TRIES` small maps; a call that overlaps a newer one can add a dropped file back until the next call.
 */
const cachedByRoot = new Map<string, Map<string, CachedResults>>();

const readResults = async (root: string, name: string): Promise<Map<string, AtomResult> | null> => {
  const summary = await readRunSummaryFile(root, name);

  if (summary === null) return null;

  return atomResultsOf(summary.tasks);
};

/** Forgets `entry`, unless a read of another mtime or size took its place or its file was dropped since. */
const forget = (root: string, name: string, entry: CachedResults): void => {
  const ofRoot = cachedByRoot.get(root);
  const isKept = ofRoot?.get(name) === entry;

  if (!isKept) return;

  ofRoot.delete(name);

  if (ofRoot.size === 0) cachedByRoot.delete(root);
};

/**
 * The result of every task `<root>/.turbo/runs/<file.name>` lists, by `taskId`. Read with `readRunSummaryFile` once and
 * kept while the file's `mtimeMs` and `size` stay those of `file`: the read is kept from its start, so calls that
 * overlap share it, and a call with another mtime or size starts one of its own. `null`, kept nowhere, when that read
 * is `null`, so a summary still being written is tried again; a read that rejects is kept nowhere either. A read that
 * never settles holds every later call with the same mtime and size until the file's listing changes. The map is shared
 * between calls.
 */
export const readCachedAtomResults = async (root: string, file: RunSummaryFile): Promise<ReadonlyMap<string, AtomResult> | null> => {
  const cached = cachedByRoot.get(root)?.get(file.name);
  const isUnchanged = cached?.mtimeMs === file.mtimeMs && cached.size === file.size;

  if (isUnchanged) return cached.pending;

  const pending = readResults(root, file.name);
  const entry: CachedResults = { mtimeMs: file.mtimeMs, size: file.size, pending };
  const ofRoot = cachedByRoot.get(root) ?? new Map<string, CachedResults>();

  ofRoot.set(file.name, entry);
  cachedByRoot.set(root, ofRoot);

  try {
    const results = await pending;

    if (results === null) forget(root, file.name, entry);

    return results;
  } catch (error) {
    forget(root, file.name, entry);

    throw error;
  }
};

/** Forgets what is kept for `root` of every file not in `files`, so `root` holds at most `files.length` entries. */
export const dropUnlistedAtomResults = (root: string, files: RunSummaryFile[]): void => {
  const ofRoot = cachedByRoot.get(root);

  if (ofRoot === undefined) return;

  const listed = new Set(files.map((file) => file.name));

  for (const name of ofRoot.keys()) {
    const isListed = listed.has(name);

    if (!isListed) ofRoot.delete(name);
  }

  if (ofRoot.size === 0) cachedByRoot.delete(root);
};
