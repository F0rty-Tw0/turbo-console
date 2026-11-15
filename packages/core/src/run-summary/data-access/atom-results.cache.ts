import { readRunSummaryFile } from './run-summary-files.ts';
import type { AtomResult } from '../common/atom-result.type.ts';
import type { RunSummaryFile } from '../common/run-summary-file.type.ts';
import { atomResultsOf } from '../utils/atom-result.util.ts';

type CachedResults = {
  readonly mtimeMs: number;
  readonly size: number;
  readonly results: Map<string, AtomResult>;
};

/**
 * Per workspace root as given, then per summary file name. Only the small derived results are kept, never the parsed
 * summary: a summary lists every task of a run and would stay pinned in the host process.
 */
const cachedByRoot = new Map<string, Map<string, CachedResults>>();

/**
 * The result of every task `<root>/.turbo/runs/<file.name>` lists, by `taskId`. Read with `readRunSummaryFile` once and
 * kept while the file's `mtimeMs` and `size` stay those of `file`; `null`, kept nowhere, when that read is `null`, so a
 * summary still being written is tried again. The map is shared between calls.
 */
export const readCachedAtomResults = async (root: string, file: RunSummaryFile): Promise<ReadonlyMap<string, AtomResult> | null> => {
  const cached = cachedByRoot.get(root)?.get(file.name);
  const isUnchanged = cached?.mtimeMs === file.mtimeMs && cached.size === file.size;

  if (isUnchanged) return cached.results;

  const summary = await readRunSummaryFile(root, file.name);

  if (summary === null) return null;

  const results = atomResultsOf(summary.tasks);
  const entry: CachedResults = { mtimeMs: file.mtimeMs, size: file.size, results };
  const ofRoot = cachedByRoot.get(root) ?? new Map<string, CachedResults>();

  ofRoot.set(file.name, entry);
  cachedByRoot.set(root, ofRoot);

  return results;
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
