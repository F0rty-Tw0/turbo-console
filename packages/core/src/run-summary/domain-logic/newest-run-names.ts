import type { RunSummaryFile } from '../common/run-summary-file.type.ts';
import { MAX_SUMMARY_TRIES, SUMMARY_MTIME_SLACK_MS } from '../common/run-summary.const.ts';
import { listRunSummaryFiles } from '../data-access/run-summary-files.ts';
import { newestFirst } from '../utils/run-summary-order.util.ts';

const isAnyFile = (): boolean => true;

const namesOf = (files: RunSummaryFile[] | null): string[] | null => {
  if (files === null) return null;

  return files.map((file) => file.name);
};

/**
 * The newest `MAX_SUMMARY_TRIES` files of `<root>/.turbo/runs` that `isKept` keeps, newest first, each with the mtime
 * and size the listing saw; `null` when there is no runs directory. The filter runs before the cap, so dropped files
 * take no place. Rejects with `TurboException` `io` as `listRunSummaryFiles` does.
 */
const newestRunFiles = async (root: string, isKept: (file: RunSummaryFile) => boolean): Promise<RunSummaryFile[] | null> => {
  const files = await listRunSummaryFiles(root);

  if (files === null) return null;

  const newest = newestFirst(files.filter(isKept));

  return newest.slice(0, MAX_SUMMARY_TRIES);
};

/** The names of `newestRunFiles`, which keeps every file by default. */
export const newestRunNames = async (
  root: string,
  isKept: (file: RunSummaryFile) => boolean = isAnyFile
): Promise<string[] | null> => {
  const files = await newestRunFiles(root, isKept);

  return namesOf(files);
};

/**
 * `newestRunFiles` without the files dated more than `SUMMARY_MTIME_SLACK_MS` past now, so future-dated files cannot
 * crowd out the real newest ones before the cap.
 */
export const pastRunFiles = async (root: string): Promise<RunSummaryFile[] | null> => {
  const latestMs = Date.now() + SUMMARY_MTIME_SLACK_MS;
  const isNotFuture = (file: RunSummaryFile): boolean => file.mtimeMs <= latestMs;
  const files = await newestRunFiles(root, isNotFuture);

  return files;
};

/** The names of `pastRunFiles`. */
export const pastRunNames = async (root: string): Promise<string[] | null> => {
  const files = await pastRunFiles(root);

  return namesOf(files);
};
