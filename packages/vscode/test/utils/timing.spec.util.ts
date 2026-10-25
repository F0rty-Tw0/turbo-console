import type { TimeRange, TurboRun } from '../common/launch.type.ts';

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

/**
 * How long this thread sat idle inside `window` while `runs` were alive, in ms: each run's length less its `busyMs`,
 * so time this thread spent blocked while turbo ran is not counted as turbo's. A run the window clips counts its idle
 * share of the part inside, which assumes the busy time is spread evenly over the run. Runs are summed, which assumes
 * they never overlap (core awaits `--version` before it spawns the query); `coveredMs` caps the sum, so overlapping runs
 * never count more than the time they cover.
 */
export const idleMs = (runs: TurboRun[], window: TimeRange): number => {
  const idleOf = (run: TurboRun): number => {
    const inside = coveredMs([run], window);
    const length = run.end - run.start;

    if (inside === 0) return 0;

    const idleShare = 1 - run.busyMs / length;

    return inside * idleShare;
  };
  const add = (sum: number, ms: number): number => sum + ms;
  const idles = runs.map(idleOf);
  const idle = idles.reduce(add, 0);
  const covered = coveredMs(runs, window);

  return Math.min(idle, covered);
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
