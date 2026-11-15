import { compareText } from '../../shared/text/utils/compare-text.util.ts';
import type { RunSummaryFile } from '../common/run-summary-file.type.ts';

/** Newer first; on equal mtimes the larger name first, in default string order. */
const compareNewest = (left: RunSummaryFile, right: RunSummaryFile): number => {
  const byTime = right.mtimeMs - left.mtimeMs;

  if (byTime !== 0) return byTime;

  return compareText(right.name, left.name);
};

/** `files` by mtime descending, then name descending. */
export const newestFirst = (files: RunSummaryFile[]): RunSummaryFile[] => files.toSorted(compareNewest);
