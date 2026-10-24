import { pastRunNames } from './newest-run-names.ts';
import type { RunSummary } from '../../shared/turbo/common/turbo.type.ts';
import type { AtomResult } from '../common/atom-result.type.ts';
import { readRunSummaryFile } from '../data-access/run-summary-files.ts';
import { atomResultOf } from '../utils/atom-result.util.ts';

/** Adds the entries of `summary` whose id is wanted and has no result yet. */
const collect = (summary: RunSummary, fileIds: ReadonlySet<string>, results: Map<string, AtomResult>): void => {
  for (const entry of summary.tasks) {
    const isWanted = fileIds.has(entry.taskId);
    const isKnown = results.has(entry.taskId);
    const isNeeded = isWanted && !isKnown;

    if (isNeeded) results.set(entry.taskId, atomResultOf(entry));
  }
};

/**
 * The newest result of each of `fileIds` (exact `taskId` match) across the newest `MAX_SUMMARY_TRIES`
 * summaries of `<root>/.turbo/runs`, newest first, future-dated files left out before that cap as `readNewestRunSummary`
 * does. A summary that fails to read or parse is skipped whole. Stops reading once every id has a result, so an id in
 * no summary has no key. Empty map when there is no runs directory. Rejects with `TurboException` `io` as
 * `pastRunNames` does.
 */
export const readAtomResults = async (root: string, fileIds: ReadonlySet<string>): Promise<Map<string, AtomResult>> => {
  const results = new Map<string, AtomResult>();

  if (fileIds.size === 0) return results;

  const names = await pastRunNames(root);

  if (names === null) return results;

  for (const name of names) {
    const summary = await readRunSummaryFile(root, name);

    if (summary !== null) collect(summary, fileIds, results);

    if (results.size === fileIds.size) return results;
  }

  return results;
};
