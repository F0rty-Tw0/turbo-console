import type { RunSummaryFile } from '../common/run-summary-file.type.ts';
import { MAX_SUMMARY_TRIES, SUMMARY_MTIME_SLACK_MS } from '../common/run-summary.const.ts';
import { listRunSummaryFiles } from '../data-access/run-summary-files.ts';
import { newestFirst } from '../utils/run-summary-order.util.ts';

const isAnyFile = (): boolean => true;

/**
 * The names of the newest `MAX_SUMMARY_TRIES` files of `<root>/.turbo/runs` that `isKept` keeps (all by default), newest
 * first; `null` when there is no runs directory. The filter runs before the cap, so dropped files take no place. Rejects
 * with `TurboException` `io` as `listRunSummaryFiles` does.
 */
export const newestRunNames = async (
  root: string,
  isKept: (file: RunSummaryFile) => boolean = isAnyFile
): Promise<string[] | null> => {
  const files = await listRunSummaryFiles(root);

  if (files === null) return null;

  const names = newestFirst(files.filter(isKept));

  return names.slice(0, MAX_SUMMARY_TRIES);
};

/**
 * `newestRunNames` without the files dated more than `SUMMARY_MTIME_SLACK_MS` past now, so future-dated files cannot
 * crowd out the real newest ones before the cap.
 */
export const pastRunNames = async (root: string): Promise<string[] | null> => {
  const latestMs = Date.now() + SUMMARY_MTIME_SLACK_MS;
  const isNotFuture = (file: RunSummaryFile): boolean => file.mtimeMs <= latestMs;
  const names = await newestRunNames(root, isNotFuture);

  return names;
};
