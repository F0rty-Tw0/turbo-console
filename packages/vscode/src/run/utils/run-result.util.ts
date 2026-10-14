import type { RunMatch } from '@turbo-console/core';

import type { RunEntry } from '../common/run.type.ts';

/** A match still being settled (`matching`) counts as no match, so a reader never sees a half-finished result. */
export const settledMatchOf = (entry: RunEntry): RunMatch | null => (entry.matching ? null : entry.match);

/** Seconds with one decimal and an `s`: 3200 ms is `3.2s`. */
export const secondsText = (durationMs: number): string => {
  const seconds = durationMs / 1000;

  return `${seconds.toFixed(1)}s`;
};
