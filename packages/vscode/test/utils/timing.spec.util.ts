import type { TimeRange } from '../common/launch.type.ts';

/** How much of `window` at least one of `ranges` covers, in ms: an overlap of two ranges counts once. */
export const coveredMs = (ranges: TimeRange[], window: TimeRange): number => {
  const byStart = (a: TimeRange, b: TimeRange): number => a.start - b.start;
  const sorted = ranges.toSorted(byStart);
  let covered = 0;
  let reach = window.start;

  for (const range of sorted) {
    const from = Math.max(range.start, reach);
    const to = Math.min(range.end, window.end);

    if (to > from) covered += to - from;

    reach = Math.max(reach, to);
  }

  return covered;
};

/** The middle of `values`, or the mean of the middle two for an even count; `NaN` for none. */
export const medianOf = (values: number[]): number => {
  const ascending = (a: number, b: number): number => a - b;
  const sorted = values.toSorted(ascending);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle] ?? Number.NaN;
  const lower = sorted[middle - 1] ?? Number.NaN;
  const isEven = sorted.length % 2 === 0;

  if (isEven) return (lower + upper) / 2;

  return upper;
};
