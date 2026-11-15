import { pastRunFiles } from './newest-run-names.ts';
import type { AtomResult } from '../common/atom-result.type.ts';
import { dropUnlistedAtomResults, readCachedAtomResults } from '../data-access/atom-results.cache.ts';

/** Adds the entries of `found`, one summary's results, whose id is wanted and has no result yet. */
const collect = (found: ReadonlyMap<string, AtomResult>, fileIds: ReadonlySet<string>, results: Map<string, AtomResult>): void => {
  for (const [taskId, result] of found) {
    const isWanted = fileIds.has(taskId);
    const isKnown = results.has(taskId);
    const isNeeded = isWanted && !isKnown;

    if (isNeeded) results.set(taskId, result);
  }
};

/**
 * The newest result of each of `fileIds` (exact `taskId` match) across the newest `MAX_SUMMARY_TRIES`
 * summaries of `<root>/.turbo/runs`, newest first, future-dated files left out before that cap as `readNewestRunSummary`
 * does. A summary that fails to read or parse is skipped whole. Stops reading once every id has a result, so an id in
 * no summary has no key. Empty map when there is no runs directory. Rejects with `TurboException` `io` as
 * `pastRunFiles` does.
 *
 * A summary is read once and its results kept while its mtime and size are unchanged (`readCachedAtomResults`), so a
 * call over unchanged files reads none; a call that lists files drops what is kept of the files no longer among them.
 */
export const readAtomResults = async (root: string, fileIds: ReadonlySet<string>): Promise<Map<string, AtomResult>> => {
  const results = new Map<string, AtomResult>();

  if (fileIds.size === 0) return results;

  const listed = await pastRunFiles(root);
  const files = listed ?? [];

  dropUnlistedAtomResults(root, files);

  for (const file of files) {
    const found = await readCachedAtomResults(root, file);

    if (found !== null) collect(found, fileIds, results);

    if (results.size === fileIds.size) return results;
  }

  return results;
};
