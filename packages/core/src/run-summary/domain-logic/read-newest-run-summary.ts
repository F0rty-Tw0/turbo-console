import type { RunSummary } from '../../shared/turbo/common/turbo.type.ts';
import { MAX_SUMMARY_TRIES } from '../common/run-summary.const.ts';
import { listRunSummaryFiles, readRunSummaryFile } from '../data-access/run-summary-files.ts';
import { newestFirst } from '../utils/run-summary-order.util.ts';

/**
 * Spec §4.7: the newest regular `<root>/.turbo/runs/*.json` (mtime descending, then name descending) that parses with
 * `runSummarySchema`, trying at most the newest `MAX_SUMMARY_TRIES`; files that fail to read or parse, or pass
 * `MAX_SUMMARY_BYTES`, are skipped, since a summary still being written is normal. Symlinked files are ignored, and a
 * runs directory that resolves outside `root` counts as none. No spawn, no binary. `null` when the directory does not
 * exist or a path part is not a directory, or when there is no valid summary. Rejects with `TurboException` `io` only,
 * when the directory or a file in it exists but cannot be resolved, listed or stat'ed.
 */
export const readNewestRunSummary = async (root: string): Promise<RunSummary | null> => {
  const files = await listRunSummaryFiles(root);

  if (files === null) return null;

  const names = newestFirst(files);
  const tried = names.slice(0, MAX_SUMMARY_TRIES);

  for (const name of tried) {
    const summary = await readRunSummaryFile(root, name);

    if (summary !== null) return summary;
  }

  return null;
};
