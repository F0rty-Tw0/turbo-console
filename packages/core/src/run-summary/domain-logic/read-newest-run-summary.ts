import { pastRunNames } from './newest-run-names.ts';
import type { RunSummary } from '../../shared/turbo/common/turbo.type.ts';
import { readRunSummaryFile } from '../data-access/run-summary-files.ts';

/**
 * Spec §4.7: the newest regular `<root>/.turbo/runs/*.json` (mtime descending, then name descending) that parses with
 * `runSummarySchema`, trying at most the newest `MAX_SUMMARY_TRIES`. Files dated more than `SUMMARY_MTIME_SLACK_MS`
 * past now are left out before that cap, so future-dated files cannot crowd out the real newest summary. Files that
 * fail to read or parse, or pass `MAX_SUMMARY_BYTES`, are skipped, since a summary still being written is normal.
 * Symlinked files are ignored, and a runs directory that resolves outside `root` counts as none. No spawn, no binary. `null` when the directory does not
 * exist or a path part is not a directory, or when there is no valid summary. Rejects with `TurboException` `io` only,
 * when the directory or a file in it exists but cannot be resolved, listed or stat'ed.
 */
export const readNewestRunSummary = async (root: string): Promise<RunSummary | null> => {
  const names = await pastRunNames(root);

  if (names === null) return null;

  for (const name of names) {
    const summary = await readRunSummaryFile(root, name);

    if (summary !== null) return summary;
  }

  return null;
};
