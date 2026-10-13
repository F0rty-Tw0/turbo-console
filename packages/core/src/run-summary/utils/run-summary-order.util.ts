import type { RunSummaryFile } from '../common/run-summary-file.type.ts';

/** Newer first; on equal mtimes the larger name first, in default string order. */
const compareNewest = (left: RunSummaryFile, right: RunSummaryFile): number => {
  const byTime = right.mtimeMs - left.mtimeMs;

  if (byTime !== 0) return byTime;

  return Number(left.name < right.name) - Number(left.name > right.name);
};

/** File names by mtime descending, then name descending. */
export const newestFirst = (files: RunSummaryFile[]): string[] => {
  const sorted = files.toSorted(compareNewest);

  return sorted.map((file) => file.name);
};
